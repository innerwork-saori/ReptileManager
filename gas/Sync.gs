// Sync.gs

var OPLOG_PAGE_SIZE = 200
var SYNC_STATE_PREFIX = "SYNC_STATE_"
var SYNC_STATE_VERSION = 1

function handleOpLogPush(payload) {
  var auth = requireGasAccessToken_(payload)
  if (!auth.ok) {
    return jsonResponse(401, null, auth.error)
  }

  var clientId = asNonEmptyString(payload.clientId)
  if (!clientId) {
    return jsonResponse(400, null, {
      code: "CLIENT_ID_REQUIRED",
      message: "clientId is required."
    })
  }

  if (!Array.isArray(payload.operations)) {
    return jsonResponse(400, null, {
      code: "OPERATIONS_REQUIRED",
      message: "operations must be an array."
    })
  }

  var state = readSyncState_(auth.claims.sub)
  var operations = payload.operations
  var acceptedCount = 0
  var duplicateCount = 0
  var invalidCount = 0
  var maxSeq = Number(state.lastSeqByClient[clientId] || 0)
  var nowIso = new Date().toISOString()

  for (var i = 0; i < operations.length; i++) {
    var op = normalizeIncomingOp_(operations[i], clientId)
    if (!op) {
      invalidCount++
      continue
    }

    if (hasExistingOp_(state, op.clientId, op.seq)) {
      duplicateCount++
      continue
    }

    state.ops.push({
      opId: op.clientId + ":" + op.seq,
      clientId: op.clientId,
      seq: op.seq,
      tableName: op.tableName,
      operation: op.operation,
      docId: op.docId,
      beforeData: op.beforeData,
      afterData: op.afterData,
      timestamp: op.timestamp,
      receivedAt: nowIso
    })

    if (op.seq > maxSeq) {
      maxSeq = op.seq
    }

    acceptedCount++
  }

  state.lastSeqByClient[clientId] = maxSeq
  state.updatedAt = nowIso
  writeSyncState_(auth.claims.sub, state)

  return jsonResponse(200, {
    acceptedCount: acceptedCount,
    duplicateCount: duplicateCount,
    invalidCount: invalidCount,
    lastSeqByClient: state.lastSeqByClient,
    serverTime: nowIso
  }, null)
}

function handleOpLogPull(payload) {
  var auth = requireGasAccessToken_(payload)
  if (!auth.ok) {
    return jsonResponse(401, null, auth.error)
  }

  var requesterClientId = asNonEmptyString(payload.clientId)
  if (!requesterClientId) {
    return jsonResponse(400, null, {
      code: "CLIENT_ID_REQUIRED",
      message: "clientId is required."
    })
  }

  var knownSeqByClient = normalizeKnownSeqByClient_(payload.knownSeqByClient)
  var state = readSyncState_(auth.claims.sub)

  var pending = []
  for (var i = 0; i < state.ops.length; i++) {
    var op = state.ops[i]

    // 預設不回自己的操作；若你之後要做完整 ACK，可再打開
    if (op.clientId === requesterClientId) {
      continue
    }

    var knownSeq = Number(knownSeqByClient[op.clientId] || 0)
    if (op.seq > knownSeq) {
      pending.push(op)
    }
  }

  pending.sort(compareOps_)

  var page = pending.slice(0, OPLOG_PAGE_SIZE)
  var nextKnownSeqByClient = cloneObject_(knownSeqByClient)

  for (var j = 0; j < page.length; j++) {
    var item = page[j]
    var current = Number(nextKnownSeqByClient[item.clientId] || 0)
    if (item.seq > current) {
      nextKnownSeqByClient[item.clientId] = item.seq
    }
  }

  return jsonResponse(200, {
    operations: page,
    hasMore: pending.length > OPLOG_PAGE_SIZE,
    nextKnownSeqByClient: nextKnownSeqByClient,
    serverTime: new Date().toISOString()
  }, null)
}

function requireGasAccessToken_(payload) {
  var token = readBearerToken_(payload)
  if (!token) {
    return {
      ok: false,
      error: {
        code: "ACCESS_TOKEN_REQUIRED",
        message: "Gas access token is required."
      }
    }
  }

  var claims = verifyGasAccessToken_(token)
  if (!claims.ok) {
    return claims
  }

  return {
    ok: true,
    claims: claims.claims
  }
}

function readBearerToken_(payload) {
  if (payload && typeof payload.accessToken === "string" && payload.accessToken.trim()) {
    return payload.accessToken.trim()
  }
  return ""
}

function verifyGasAccessToken_(token) {
  try {
    var parts = String(token).split(".")
    if (parts.length !== 2) {
      return {
        ok: false,
        error: {
          code: "ACCESS_TOKEN_INVALID",
          message: "Malformed access token."
        }
      }
    }

    var payloadB64 = parts[0]
    var sig = parts[1]
    var salt = getRequiredProperty_("TOKEN_ENCRYPTION_SALT")
    var expectedSig = base64WebSafeNoPaddingFromBytes_(
      Utilities.computeHmacSha256Signature(payloadB64, salt)
    )

    if (sig !== expectedSig) {
      return {
        ok: false,
        error: {
          code: "ACCESS_TOKEN_SIGNATURE_INVALID",
          message: "Invalid access token signature."
        }
      }
    }

    var payloadJson = Utilities.newBlob(Utilities.base64DecodeWebSafe(payloadB64)).getDataAsString()
    var claims = safeJsonParse_(payloadJson, null)

    if (!claims || typeof claims !== "object") {
      return {
        ok: false,
        error: {
          code: "ACCESS_TOKEN_PAYLOAD_INVALID",
          message: "Invalid access token payload."
        }
      }
    }

    var nowSec = Math.floor(Date.now() / 1000)
    if (!claims.exp || Number(claims.exp) <= nowSec) {
      return {
        ok: false,
        error: {
          code: "ACCESS_TOKEN_EXPIRED",
          message: "Access token expired."
        }
      }
    }

    if (!claims.sub || !claims.email) {
      return {
        ok: false,
        error: {
          code: "ACCESS_TOKEN_CLAIMS_INVALID",
          message: "Access token missing required claims."
        }
      }
    }

    return {
      ok: true,
      claims: claims
    }
  } catch (err) {
    return {
      ok: false,
      error: {
        code: "ACCESS_TOKEN_VERIFY_ERROR",
        message: "Failed to verify access token."
      }
    }
  }
}

function normalizeIncomingOp_(input, fallbackClientId) {
  if (!input || typeof input !== "object") return null

  var clientId = asNonEmptyString(input.clientId) || fallbackClientId
  var seq = Number(input.seq)
  var tableName = asNonEmptyString(input.tableName)
  var operation = asNonEmptyString(input.operation)
  var docId = asNonEmptyString(input.docId)
  var timestamp = asNonEmptyString(input.timestamp) || new Date().toISOString()

  if (!clientId) return null
  if (!isFinite(seq) || seq <= 0) return null
  if (!tableName) return null
  if (!operation) return null
  if (!docId) return null

  if (["insert", "update", "delete"].indexOf(operation) < 0) {
    return null
  }

  return {
    clientId: clientId,
    seq: seq,
    tableName: tableName,
    operation: operation,
    docId: docId,
    beforeData: input.beforeData,
    afterData: input.afterData,
    timestamp: timestamp
  }
}

function normalizeKnownSeqByClient_(input) {
  if (!input || typeof input !== "object") return {}
  var result = {}
  for (var key in input) {
    if (!Object.prototype.hasOwnProperty.call(input, key)) continue
    var value = Number(input[key])
    result[key] = isFinite(value) && value > 0 ? value : 0
  }
  return result
}

function compareOps_(a, b) {
  var timeCmp = String(a.timestamp).localeCompare(String(b.timestamp))
  if (timeCmp !== 0) return timeCmp

  var clientCmp = String(a.clientId).localeCompare(String(b.clientId))
  if (clientCmp !== 0) return clientCmp

  return Number(a.seq) - Number(b.seq)
}

function hasExistingOp_(state, clientId, seq) {
  var opId = clientId + ":" + seq
  for (var i = 0; i < state.ops.length; i++) {
    if (state.ops[i].opId === opId) return true
  }
  return false
}

function readSyncState_(sub) {
  var key = syncStateKey_(sub)
  var raw = PropertiesService.getScriptProperties().getProperty(key)
  if (!raw) {
    return {
      version: SYNC_STATE_VERSION,
      sub: sub,
      ops: [],
      lastSeqByClient: {},
      updatedAt: new Date().toISOString()
    }
  }

  var parsed = unsealData_(raw)
  if (!parsed || typeof parsed !== "object") {
    return {
      version: SYNC_STATE_VERSION,
      sub: sub,
      ops: [],
      lastSeqByClient: {},
      updatedAt: new Date().toISOString()
    }
  }

  parsed.ops = Array.isArray(parsed.ops) ? parsed.ops : []
  parsed.lastSeqByClient = (parsed.lastSeqByClient && typeof parsed.lastSeqByClient === "object")
    ? parsed.lastSeqByClient
    : {}

  return parsed
}

function writeSyncState_(sub, state) {
  var key = syncStateKey_(sub)
  var sealed = sealData_(state)
  PropertiesService.getScriptProperties().setProperty(key, sealed)
}

function syncStateKey_(sub) {
  return SYNC_STATE_PREFIX + hashSha256WebSafe_(String(sub)).substring(0, 48)
}

function cloneObject_(obj) {
  return JSON.parse(JSON.stringify(obj || {}))
}