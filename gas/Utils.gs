// Utils.gs

function jsonResponse(status, data, error) {
  var body = { status: Number(status || 200) }

  if (data !== null && data !== undefined) {
    body.data = data
  }

  if (error) {
    body.error = error
  }

  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON)
}

function parseRequestBody(e) {
  if (!e || !e.postData || typeof e.postData.contents !== "string") {
    return {}
  }

  var raw = e.postData.contents
  if (!raw || !raw.trim()) return {}

  var parsed = safeJsonParse_(raw, null)
  if (parsed === null || typeof parsed !== "object") {
    throw new Error("INVALID_JSON_BODY")
  }

  return parsed
}

function safeJsonParse_(text, fallback) {
  try {
    return JSON.parse(text)
  } catch (err) {
    return fallback
  }
}

function normalizeError(err) {
  if (!err) {
    return { code: "INTERNAL_ERROR", message: "Unknown error" }
  }

  var msg = ""
  if (typeof err === "string") msg = err
  else if (err && err.message) msg = String(err.message)
  else msg = "Unexpected server error"

  return {
    code: "INTERNAL_ERROR",
    message: msg
  }
}

function asNonEmptyString(v) {
  if (typeof v !== "string") return ""
  var s = v.trim()
  return s.length > 0 ? s : ""
}

function getRequiredProperty_(key) {
  var value = PropertiesService.getScriptProperties().getProperty(key)
  if (!value || !value.trim()) {
    throw new Error("MISSING_SCRIPT_PROPERTY_" + key)
  }
  return value.trim()
}

function randomToken_(byteLength) {
  var len = Number(byteLength || 32)
  var bytes = Utilities.newBlob(Utilities.getUuid() + "|" + Date.now() + "|" + Math.random()).getBytes()
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes)
  var b64 = base64WebSafeNoPaddingFromBytes_(digest)

  while (b64.length < len * 2) {
    var extra = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      Utilities.newBlob(b64 + "|" + Math.random()).getBytes()
    )
    b64 += base64WebSafeNoPaddingFromBytes_(extra)
  }

  return b64.substring(0, len * 2)
}

function hashSha256WebSafe_(text) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(text),
    Utilities.Charset.UTF_8
  )
  return base64WebSafeNoPaddingFromBytes_(bytes)
}

function base64WebSafeNoPaddingFromString_(str) {
  var b64 = Utilities.base64EncodeWebSafe(str, Utilities.Charset.UTF_8)
  return b64.replace(/=+$/g, "")
}

function base64WebSafeNoPaddingFromBytes_(bytes) {
  var b64 = Utilities.base64EncodeWebSafe(bytes)
  return b64.replace(/=+$/g, "")
}

function sealData_(obj) {
  var json = JSON.stringify(obj || {})
  var salt = getRequiredProperty_("TOKEN_ENCRYPTION_SALT")
  var payload = base64WebSafeNoPaddingFromString_(json)
  var sig = hashSha256WebSafe_(payload + "|" + salt)
  return payload + "." + sig
}

function unsealData_(sealed) {
  if (!sealed || typeof sealed !== "string" || sealed.indexOf(".") < 0) return null
  var parts = sealed.split(".")
  if (parts.length !== 2) return null

  var payload = parts[0]
  var sig = parts[1]
  var salt = getRequiredProperty_("TOKEN_ENCRYPTION_SALT")
  var expected = hashSha256WebSafe_(payload + "|" + salt)

  if (sig !== expected) return null

  var json = Utilities.newBlob(Utilities.base64DecodeWebSafe(payload)).getDataAsString()
  return safeJsonParse_(json, null)
}