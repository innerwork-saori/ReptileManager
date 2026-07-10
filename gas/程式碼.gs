// ============================================
// 設定
// ============================================

const SHEET_ID = '16k7PALx8NJJKybjzCLHGUu42Sf5qxxT9LEKKwVOUrfs';
const JWT_SECRET = PropertiesService.getScriptProperties().getProperty('JWT_SECRET') || 'default-secret';

// ============================================
// API 路由與基礎端點
// ============================================

function doPost(e) {
  try {
    const path = e.parameter.path || e.pathInfo;
    const payload = e.postData?.contents ? JSON.parse(e.postData.contents) : {};
    
    let result;
    
    // 路由分發
    if (path === 'health') {
      result = { status: 'ok', timestamp: new Date().toISOString() };
    } else if (path === 'auth/google/exchange') {
      result = handleAuthExchange(payload);
    } else if (path === 'auth/refresh') {
      result = handleAuthRefresh(payload);
    } else if (path === 'auth/me') {
      result = handleAuthMe(e);
    } else {
      result = { error: 'Endpoint not found', status: 404 };
    }
    
    return respondWithCORS(result.status || 200, result);
  } catch (error) {
    Logger.log('Error: ' + error.toString());
    return respondWithCORS(500, { error: error.toString() });
  }
}

function doGet(e) {
const path = (e && e.parameter && e.parameter.path) ? e.parameter.path : '';

if (!path) {
return HtmlService.createHtmlOutput(buildTestPageHtml())
.setTitle('ReptileManager GAS Auth Tester')
.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

if (path === 'health') {
return ContentService
.createTextOutput(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }))
.setMimeType(ContentService.MimeType.JSON);
}

return ContentService
.createTextOutput(JSON.stringify({ status: 404, error: 'not_found' }))
.setMimeType(ContentService.MimeType.JSON);
}

function buildTestPageHtml() {
return '<!doctype html>' +
'<html><head><meta charset="utf-8">' +
'<meta name="viewport" content="width=device-width,initial-scale=1">' +
'<title>GAS Auth Tester</title>' +
'<style>' +
'body{font-family:Arial,sans-serif;max-width:900px;margin:24px auto;padding:0 16px;line-height:1.5}' +
'h1{font-size:22px;margin:0 0 12px}' +
'.card{border:1px solid #ddd;border-radius:10px;padding:14px;margin:12px 0}' +
'label{display:block;font-weight:600;margin:8px 0 4px}' +
'input,textarea{width:100%;padding:10px;border:1px solid #ccc;border-radius:8px;font-size:14px}' +
'button{padding:10px 14px;border:0;border-radius:8px;background:#2D5A27;color:#fff;font-weight:700;cursor:pointer;margin-right:8px;margin-top:10px}' +
'button.secondary{background:#555}' +
'.muted{color:#666;font-size:13px}' +
'pre{background:#f7f7f7;padding:12px;border-radius:8px;overflow:auto;min-height:120px}' +
'</style></head><body>' +


'<h1>ReptileManager GAS Auth Tester</h1>' +
'<p class="muted">先貼 googleAccessToken，按 Exchange。成功後會自動填入 refreshToken，再按 Refresh。</p>' +

'<div class="card">' +
'<label>googleAccessToken</label>' +
'<textarea id="googleAccessToken" rows="5" placeholder="貼上 Google access token"></textarea>' +
'<button onclick="runExchange()">Test Exchange</button>' +
'</div>' +

'<div class="card">' +
'<label>refreshToken</label>' +
'<input id="refreshToken" placeholder="Exchange 成功後會自動填入">' +
'<button onclick="runRefresh()">Test Refresh</button>' +
'<button class="secondary" onclick="clearOutput()">Clear Output</button>' +
'</div>' +

'<div class="card">' +
'<label>Result</label>' +
'<pre id="output"></pre>' +
'</div>' +

'<script>' +
'function print(obj){document.getElementById("output").textContent=JSON.stringify(obj,null,2);}' +
'function clearOutput(){document.getElementById("output").textContent="";}' +

'function runExchange(){' +
  'var token=document.getElementById("googleAccessToken").value.trim();' +
  'if(!token){print({status:400,error:"missing_googleAccessToken"});return;}' +
  'google.script.run' +
    '.withSuccessHandler(function(res){' +
      'print(res);' +
      'if(res && res.refreshToken){document.getElementById("refreshToken").value=res.refreshToken;}' +
    '})' +
    '.withFailureHandler(function(err){print({status:500,error:String(err)});})' +
    '.testAuthExchange(token);' +
'}' +

'function runRefresh(){' +
  'var rt=document.getElementById("refreshToken").value.trim();' +
  'if(!rt){print({status:400,error:"missing_refreshToken"});return;}' +
  'google.script.run' +
    '.withSuccessHandler(function(res){' +
      'print(res);' +
      'if(res && res.refreshToken){document.getElementById("refreshToken").value=res.refreshToken;}' +
    '})' +
    '.withFailureHandler(function(err){print({status:500,error:String(err)});})' +
    '.testAuthRefresh(rt);' +
'}' +
'</script></body></html>';
}

function testAuthExchange(googleAccessToken) {
var result = handleAuthExchange({ googleAccessToken: googleAccessToken });
return normalizeAuthResult(result);
}

function runExchangeWithMyToken() {
var myToken = 'ya29.a0AT3oNZ_qzgKX8KsNIX9d7UYd-h2ck3GOdsj8NR8M2KLVy-i3bklW1LMUhCeZqXMP2RqJIvC7A43z1sMNTwGRG8x4xqCBaPjMiuJ0cLSzqV3N2bknN-nFbkTyYgUwQzG0DsTH5yr1Kg8bM_-oG6gaewd9SQtOABr98fRujg9OvvPchWLUAfRlf3lUk9X0iBXGZ3RGiaMaCgYKARwSARESFQHGX2MilmzY4aYYwVYDWIrEYbetCA0206';
var result = testAuthExchange(myToken);
Logger.log(JSON.stringify(result));
}

function testAuthRefresh(refreshToken) {
var result = handleAuthRefresh({ refreshToken: refreshToken });
return normalizeAuthResult(result);
}

function normalizeAuthResult(result) {
if (!result) return { status: 500, error: 'empty_result' };

if (typeof result === 'object' && result.getContent) {
try {
return JSON.parse(result.getContent());
} catch (e) {
return { status: 500, error: 'content_parse_failed', raw: String(result) };
}
}

if (typeof result === 'object') return result;

return { status: 500, error: 'unexpected_result_type', raw: String(result) };
}
// 新增這個函數來處理 API 呼叫
function handleApiCall(path, payload) {
  try {
    if (path === 'health') {
      return { status: 200, data: { status: 'ok', timestamp: new Date().toISOString() } };
    }
    
    if (path === 'auth/google/exchange') {
      const result = handleAuthExchange(payload);
      return result;
    }
    
    if (path === 'auth/refresh') {
      const result = handleAuthRefresh(payload);
      return result;
    }
    
    return { error: 'Endpoint not found', status: 404 };
  } catch (error) {
    Logger.log('handleApiCall error: ' + error.toString());
    return { error: error.toString(), status: 500 };
  }
}

function respondWithCORS(statusCode, data) {
  const json = JSON.stringify(data);
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
</head>
<body>
<script>
if (window.opener) {
  window.opener.postMessage(${json}, '*');
  window.close();
}
</script>
</body>
</html>`;
  
  return HtmlService.createHtmlOutput(html)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function respond(statusCode, data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// 工具函式
// ============================================

function respond(statusCode, data) {
  const output = ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  
  // 嘗試加入 CORS header
  return output;
}

// ============================================
// JWT 簽發與驗證
// ============================================

function base64UrlEncodeString(str) {
  return Utilities.base64EncodeWebSafe(str).replace(/=+$/g, '');
}

function base64UrlEncodeBytes(bytes) {
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/g, '');
}

function base64UrlDecodeToString(input) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(padLen);
  const bytes = Utilities.base64Decode(padded);
  return Utilities.newBlob(bytes).getDataAsString();
}

function createJWT(payload, expiresInSeconds) {
  const ttl = Number(expiresInSeconds || 3600);
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: 'HS256', typ: 'JWT' };
  const claims = Object.assign(
    {
      iss: 'ReptileManager',
      iat: now,
      exp: now + ttl,
    },
    payload || {}
  );

  const headerEncoded = base64UrlEncodeString(JSON.stringify(header));
  const payloadEncoded = base64UrlEncodeString(JSON.stringify(claims));
  const message = headerEncoded + '.' + payloadEncoded;

  const signatureBytes = Utilities.computeHmacSha256Signature(message, JWT_SECRET);
  const signatureEncoded = base64UrlEncodeBytes(signatureBytes);

  return message + '.' + signatureEncoded;
}

function verifyJWT(token) {
  try {
    if (!token || typeof token !== 'string') return null;

    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const headerEncoded = parts[0];
    const payloadEncoded = parts[1];
    const signatureEncoded = parts[2];

    const message = headerEncoded + '.' + payloadEncoded;
    const expectedSigBytes = Utilities.computeHmacSha256Signature(message, JWT_SECRET);
    const expectedSig = base64UrlEncodeBytes(expectedSigBytes);

    if (signatureEncoded !== expectedSig) return null;

    const payloadJson = base64UrlDecodeToString(payloadEncoded);
    const payload = JSON.parse(payloadJson);

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && Number(payload.exp) < now) return null;

    return payload;
  } catch (err) {
    Logger.log('verifyJWT error: ' + err);
    return null;
  }
}

function fetchGoogleUserInfo(googleAccessToken) {
if (!googleAccessToken) throw new Error('missing_google_access_token');

const res = UrlFetchApp.fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
method: 'get',
headers: {
Authorization: 'Bearer ' + googleAccessToken
},
muteHttpExceptions: true
});

const status = res.getResponseCode();
const text = res.getContentText();

if (status < 200 || status >= 300) {
throw new Error('google_userinfo_failed:' + status + ':' + text);
}

const data = JSON.parse(text);
if (!data.sub || !data.email) {
throw new Error('google_userinfo_missing_fields');
}

return {
sub: data.sub,
email: data.email,
picture: data.picture || ''
};
}

function getRefreshTokenByValue(refreshToken) {
const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
const sheet = spreadsheet.getSheetByName('auth_tokens');
const data = sheet.getDataRange().getValues();

for (let i = 1; i < data.length; i++) {
const id = data[i][0];
const userSub = data[i][1];
const token = data[i][2];
const isRevoked = data[i][3];

if (token === refreshToken && !isRevoked) {
  return { row: i + 1, id, userSub, token, isRevoked };
}}
return null;
}

function revokeRefreshTokenById(tokenId) {
const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
const sheet = spreadsheet.getSheetByName('auth_tokens');
const data = sheet.getDataRange().getValues();

for (let i = 1; i < data.length; i++) {
const id = data[i][0];
if (id === tokenId) {
sheet.getRange(i + 1, 4).setValue(true);
sheet.getRange(i + 1, 6).setValue(new Date().toISOString());
return true;
}
}
return false;
}


// ============================================
// Refresh Token 管理
// ============================================

function createRefreshToken() {
  return Utilities.getUuid();
}

function saveRefreshToken(userSub, refreshToken) {
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  const sheet = spreadsheet.getSheetByName('auth_tokens');
  sheet.appendRow([
    Utilities.getUuid(),
    userSub,
    refreshToken,
    false, // isRevoked
    new Date().toISOString(),
    '' // revokedAt
  ]);
}

function getRefreshToken(userSub, refreshToken) {
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  const sheet = spreadsheet.getSheetByName('auth_tokens');
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    const [id, sub, token, isRevoked] = data[i];
    if (sub === userSub && token === refreshToken && !isRevoked) {
      return { id, sub, token, isRevoked };
    }
  }
  return null;
}

function revokeRefreshToken(tokenId) {
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  const sheet = spreadsheet.getSheetByName('auth_tokens');
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === tokenId) {
      sheet.getRange(i + 1, 4).setValue(true); // isRevoked
      sheet.getRange(i + 1, 6).setValue(new Date().toISOString()); // revokedAt
      return;
    }
  }
}

// ============================================
// 認證端點
// ============================================

function handleAuthExchange(payload) {
try {
const googleAccessToken = payload.googleAccessToken;
const googleUser = fetchGoogleUserInfo(googleAccessToken);
let user = getUserBySub(googleUser.sub);
if (!user) {
  user = createUser(googleUser.sub, googleUser.email, googleUser.picture);
}

const refreshToken = createRefreshToken();
saveRefreshToken(googleUser.sub, refreshToken);

const accessToken = createJWT({
  sub: googleUser.sub,
  email: googleUser.email,
  type: 'access'
}, 3600);

auditLog(googleUser.sub, 'AUTH_EXCHANGE', 'user', { email: googleUser.email });

return {
  status: 200,
  accessToken: accessToken,
  refreshToken: refreshToken,
  expiresIn: 3600,
  user: {
    sub: user.sub,
    email: user.email,
    picture: user.picture
  }
};


} catch (error) {
Logger.log('handleAuthExchange error: ' + error);
return { status: 401, error: String(error) };
}
}

function handleAuthRefresh(payload) {
try {
const refreshToken = payload.refreshToken;
if (!refreshToken) {
return { status: 400, error: 'missing_refresh_token' };
}
const tokenRow = getRefreshTokenByValue(refreshToken);
if (!tokenRow) {
  return { status: 401, error: 'invalid_or_revoked_refresh_token' };
}

const user = getUserBySub(tokenRow.userSub);
if (!user) {
  return { status: 401, error: 'user_not_found' };
}

revokeRefreshTokenById(tokenRow.id);

const newRefreshToken = createRefreshToken();
saveRefreshToken(user.sub, newRefreshToken);

const newAccessToken = createJWT({
  sub: user.sub,
  email: user.email,
  type: 'access'
}, 3600);

auditLog(user.sub, 'TOKEN_REFRESH', 'token', { rotated: true });

return {
  status: 200,
  accessToken: newAccessToken,
  refreshToken: newRefreshToken,
  expiresIn: 3600
};

} catch (error) {
Logger.log('handleAuthRefresh error: ' + error);
return { status: 500, error: String(error) };
}
}

function handleAuthMe(e) {
  const authorization = e.parameter.authorization || e.headers?.Authorization || '';
  const token = authorization.replace('Bearer ', '');
  
  if (!token) {
    return respond(401, { error: 'Missing authorization header' });
  }
  
  const payload = verifyJWT(token);
  if (!payload) {
    return respond(401, { error: 'Invalid or expired token' });
  }
  
  const user = getUserBySub(payload.sub);
  if (!user) {
    return respond(401, { error: 'User not found' });
  }
  
  return respond(200, {
    user: {
      sub: user.sub,
      email: user.email,
      picture: user.picture
    }
  });
}

// ============================================
// 使用者管理
// ============================================

function getUserBySub(sub) {
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  const sheet = spreadsheet.getSheetByName('users');
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    const [id, email, userSub, picture] = data[i];
    if (userSub === sub) {
      return { id, email, sub: userSub, picture };
    }
  }
  return null;
}

function createUser(sub, email, picture) {
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  const sheet = spreadsheet.getSheetByName('users');
  const now = new Date().toISOString();
  
  const user = {
    id: Utilities.getUuid(),
    email,
    sub,
    picture: picture || '',
    createdAt: now,
    updatedAt: now
  };
  
  sheet.appendRow([user.id, user.email, user.sub, user.picture, user.createdAt, user.updatedAt]);
  auditLog(sub, 'USER_CREATED', 'user', { email });
  
  return user;
}

// ============================================
// 審計日誌
// ============================================

function auditLog(userSub, action, resource, details) {
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  const sheet = spreadsheet.getSheetByName('audit_logs');
  sheet.appendRow([
    Utilities.getUuid(),
    userSub || 'anonymous',
    action,
    resource,
    typeof details === 'string' ? details : JSON.stringify(details),
    new Date().toISOString()
  ]);
}

// ============================================
// 初始化（保留）
// ============================================

function initializeSheets() {
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  
  const sheetsToCreate = [
    {
      name: 'users',
      headers: ['id', 'email', 'sub', 'picture', 'createdAt', 'updatedAt']
    },
    {
      name: 'auth_tokens',
      headers: ['id', 'userSub', 'refreshToken', 'isRevoked', 'createdAt', 'revokedAt']
    },
    {
      name: 'reptiles',
      headers: ['id', 'userId', 'name', 'species', 'breed', 'category', 'sex', 'birthDate', 'enclosureName', 'photoUrl', 'notes', 'chronicInfo', 'qrTargetUrl', 'fatherId', 'motherId', 'createdAt', 'updatedAt']
    },
    {
      name: 'feed_logs',
      headers: ['id', 'reptileId', 'fedAt', 'foodType', 'amount', 'notes', 'createdAt']
    },
    {
      name: 'weight_logs',
      headers: ['id', 'reptileId', 'date', 'weight', 'notes', 'createdAt']
    },
    {
      name: 'todo_rules',
      headers: ['id', 'reptileId', 'type', 'label', 'scheduleType', 'config', 'enabled', 'createdAt', 'updatedAt']
    },
    {
      name: 'todo_instances',
      headers: ['id', 'reptileId', 'ruleId', 'date', 'dueAt', 'status', 'type', 'label', 'notes', 'createdAt', 'updatedAt']
    },
    {
      name: 'audit_logs',
      headers: ['id', 'userSub', 'action', 'resource', 'details', 'timestamp']
    }
  ];
  
  sheetsToCreate.forEach(({ name, headers }) => {
    let sheet = spreadsheet.getSheetByName(name);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(name);
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      Logger.log(`✓ 建立表格: ${name}`);
    } else {
      Logger.log(`✓ 表格已存在: ${name}`);
    }
  });
  
  Logger.log('初始化完成！');
}