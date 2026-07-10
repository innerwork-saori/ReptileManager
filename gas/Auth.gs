// Auth.gs

var ACCESS_TOKEN_TTL_SEC = 3600
var REFRESH_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 180

function handleGoogleExchange(payload) {
  var googleAccessToken = asNonEmptyString(payload.googleAccessToken)
  if (!googleAccessToken) {
    return jsonResponse(400, null, {
      code: "GOOGLE_ACCESS_TOKEN_REQUIRED",
      message: "googleAccessToken is required."
    })
  }

  var verifyResult = verifyGoogleAccessToken_(googleAccessToken)
  if (!verifyResult.ok) {
    return jsonResponse(401, null, verifyResult.error)
  }

  var userInfoResult = fetchGoogleUserInfo_(googleAccessToken)
  if (!userInfoResult.ok) {
    return jsonResponse(401, null, userInfoResult.error)
  }

  var user = userInfoResult.data
  var nowMs = Date.now()

  var refreshToken = createRefreshToken_()
  var refreshRecord = {
    sub: user.sub,
    email: user.email,
    picture: user.picture || "",
    createdAt: nowMs,
    expiresAt: nowMs + REFRESH_TOKEN_TTL_MS,
    revoked: false
  }

  saveRefreshRecord_(refreshToken, refreshRecord)

  var accessToken = createAccessToken_({
    sub: user.sub,
    email: user.email,
    picture: user.picture || ""
  }, ACCESS_TOKEN_TTL_SEC)

  return jsonResponse(200, {
    accessToken: accessToken,
    refreshToken: refreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SEC,
    user: {
      sub: user.sub,
      email: user.email,
      picture: user.picture || ""
    }
  }, null)
}

function handleRefresh(payload) {
  var refreshToken = asNonEmptyString(payload.refreshToken)
  if (!refreshToken) {
    return jsonResponse(400, null, {
      code: "REFRESH_TOKEN_REQUIRED",
      message: "refreshToken is required."
    })
  }

  var existing = readRefreshRecord_(refreshToken)
  if (!existing) {
    return jsonResponse(401, null, {
      code: "INVALID_REFRESH_TOKEN",
      message: "Refresh token not found."
    })
  }

  if (existing.revoked) {
    return jsonResponse(401, null, {
      code: "REFRESH_TOKEN_REVOKED",
      message: "Refresh token was revoked."
    })
  }

  if (Date.now() >= Number(existing.expiresAt || 0)) {
    deleteRefreshRecord_(refreshToken)
    return jsonResponse(401, null, {
      code: "REFRESH_TOKEN_EXPIRED",
      message: "Refresh token has expired."
    })
  }

  var accessToken = createAccessToken_({
    sub: existing.sub,
    email: existing.email,
    picture: existing.picture || ""
  }, ACCESS_TOKEN_TTL_SEC)

  existing.lastRefreshedAt = Date.now()
  saveRefreshRecord_(refreshToken, existing)

  return jsonResponse(200, {
    accessToken: accessToken,
    refreshToken: refreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SEC
  }, null)
}

function verifyGoogleAccessToken_(googleAccessToken) {
  try {
    var tokenInfoUrl = "https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=" + encodeURIComponent(googleAccessToken)
    var tokenInfoRes = UrlFetchApp.fetch(tokenInfoUrl, {
      method: "get",
      muteHttpExceptions: true
    })

    if (tokenInfoRes.getResponseCode() !== 200) {
      return {
        ok: false,
        error: {
          code: "GOOGLE_TOKEN_INVALID",
          message: "Unable to verify Google access token."
        }
      }
    }

    var tokenInfo = safeJsonParse_(tokenInfoRes.getContentText(), {})
    var expectedClientId = getRequiredProperty_("GOOGLE_CLIENT_ID")

    if (tokenInfo.aud && String(tokenInfo.aud) !== String(expectedClientId)) {
      return {
        ok: false,
        error: {
          code: "GOOGLE_TOKEN_AUD_MISMATCH",
          message: "Google token aud does not match configured client id."
        }
      }
    }

    var expiresIn = Number(tokenInfo.expires_in || 0)
    if (!isFinite(expiresIn) || expiresIn <= 0) {
      return {
        ok: false,
        error: {
          code: "GOOGLE_TOKEN_EXPIRED",
          message: "Google access token expired."
        }
      }
    }

    return { ok: true, data: tokenInfo }
  } catch (err) {
    return {
      ok: false,
      error: {
        code: "GOOGLE_TOKEN_VERIFY_ERROR",
        message: "Failed to verify Google token."
      }
    }
  }
}

function fetchGoogleUserInfo_(googleAccessToken) {
  try {
    var userInfoRes = UrlFetchApp.fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      method: "get",
      muteHttpExceptions: true,
      headers: {
        Authorization: "Bearer " + googleAccessToken
      }
    })

    if (userInfoRes.getResponseCode() !== 200) {
      return {
        ok: false,
        error: {
          code: "GOOGLE_USERINFO_FAILED",
          message: "Unable to fetch Google user profile."
        }
      }
    }

    var userInfo = safeJsonParse_(userInfoRes.getContentText(), {})
    if (!userInfo || typeof userInfo.sub !== "string" || typeof userInfo.email !== "string") {
      return {
        ok: false,
        error: {
          code: "GOOGLE_USERINFO_INVALID",
          message: "Google user profile is missing sub or email."
        }
      }
    }

    return {
      ok: true,
      data: {
        sub: userInfo.sub,
        email: userInfo.email,
        picture: userInfo.picture || ""
      }
    }
  } catch (err) {
    return {
      ok: false,
      error: {
        code: "GOOGLE_USERINFO_ERROR",
        message: "Failed to fetch Google user profile."
      }
    }
  }
}

function createAccessToken_(claims, ttlSec) {
  var nowSec = Math.floor(Date.now() / 1000)
  var payload = {
    iss: "reptilemanager-gas",
    iat: nowSec,
    exp: nowSec + Number(ttlSec || ACCESS_TOKEN_TTL_SEC),
    sub: claims.sub,
    email: claims.email,
    picture: claims.picture || ""
  }

  var payloadJson = JSON.stringify(payload)
  var payloadB64 = base64WebSafeNoPaddingFromString_(payloadJson)

  var secret = getRequiredProperty_("TOKEN_ENCRYPTION_SALT")
  var sigBytes = Utilities.computeHmacSha256Signature(payloadB64, secret)
  var sigB64 = base64WebSafeNoPaddingFromBytes_(sigBytes)

  return payloadB64 + "." + sigB64
}

function createRefreshToken_() {
  return randomToken_(48)
}

function refreshRecordKey_(refreshToken) {
  return "RT_" + hashSha256WebSafe_(refreshToken)
}

function saveRefreshRecord_(refreshToken, record) {
  var key = refreshRecordKey_(refreshToken)
  var sealed = sealData_(record)
  PropertiesService.getScriptProperties().setProperty(key, sealed)
}

function readRefreshRecord_(refreshToken) {
  var key = refreshRecordKey_(refreshToken)
  var raw = PropertiesService.getScriptProperties().getProperty(key)
  if (!raw) return null
  return unsealData_(raw)
}

function deleteRefreshRecord_(refreshToken) {
  var key = refreshRecordKey_(refreshToken)
  PropertiesService.getScriptProperties().deleteProperty(key)
}