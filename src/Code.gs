// ─────────────────────────────────────────────────────────────
//  DMS — TAU  |  GAS REST API  (frontend lives on GitHub Pages)
// ─────────────────────────────────────────────────────────────

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action  = payload.action;
    const params  = payload.params || [];
    const result  = _route(action, params);
    return _json(result);
  } catch (err) {
    return _json({ success: false, message: 'Server error: ' + err.message });
  }
}

function doGet(e) {
  return _json({ status: 'ok', app: 'DMS — TAU', version: '2.0' });
}

function _route(action, params) {
  switch (action) {
    // ── Auth ──
    case 'sendOTP':              return sendOTP(params[0]);
    case 'verifyOTP':            return verifyOTP(params[0], params[1]);
    case 'logoutUser':           return logoutUser(params[0]);
    // ── Upload / Documents ──
    case 'getComponents':        return getComponents(params[0]);
    case 'getSubComponents':     return getSubComponents(params[0], params[1]);
    case 'getAllComponents':      return getAllComponents(params[0]);
    case 'uploadDocument':       return uploadDocument(params[0], params[1]);
    case 'getDocuments':         return getDocuments(params[0], params[1]);
    // ── Verify ──
    case 'verifyDocument':       return verifyDocument(params[0], params[1]);
    case 'rejectDocument':       return rejectDocument(params[0], params[1], params[2]);
    // ── Circulars ──
    case 'getCirculars':         return getCirculars(params[0]);
    case 'acknowledgeCircular':  return acknowledgeCircular(params[0], params[1]);
    default:
      return { success: false, message: 'Unknown action: ' + action };
  }
}

function _json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
