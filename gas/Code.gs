// Code.gs

function doGet(e) {
  return jsonResponse(200, {
    ok: true,
    service: "reptilemanager-gas-api",
    time: new Date().toISOString()
  }, null)
}

function doPost(e) {
  try {
    var req = parseRequestBody(e)
    var path = normalizePath_(req.path)

    if (!path) {
      return jsonResponse(400, null, {
        code: "PATH_REQUIRED",
        message: "Request body requires a path field."
      })
    }

    if (path === "auth/google/exchange") {
      return handleGoogleExchange(req)
    }

    if (path === "auth/refresh") {
      return handleRefresh(req)
    }

    if (path === "sync/oplog/push") {
      return handleOpLogPush(req)
    }

    if (path === "sync/oplog/pull") {
      return handleOpLogPull(req)
    }    

    return jsonResponse(404, null, {
      code: "NOT_FOUND",
      message: "Unknown path: " + path
    })
  } catch (err) {
    return jsonResponse(500, null, normalizeError(err))
  }
}

function normalizePath_(raw) {
  if (typeof raw !== "string") return ""
  return raw.replace(/^\/+|\/+$/g, "")
}