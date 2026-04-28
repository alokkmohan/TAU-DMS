// ─────────────────────────────────────────────────────────────
//  DMS — TAU  |  GAS REST API  (frontend on GitHub Pages)
// ─────────────────────────────────────────────────────────────

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const result  = _route(payload.action, payload.params || []);
    return _json(result);
  } catch (err) {
    return _json({ success: false, message: 'Server error: ' + err.message });
  }
}

function doGet(e) {
  return _json({ status: 'ok', app: 'DMS — TAU', version: '2.1' });
}

function _route(action, p) {
  switch (action) {
    // ── Auth ──────────────────────────────────
    case 'sendOTP':           return sendOTP(p[0]);
    case 'verifyOTP':         return verifyOTP(p[0], p[1]);
    case 'logoutUser':        return logoutUser(p[0]);

    // ── Upload / Documents ────────────────────
    case 'getComponents':     return getComponents(p[0]);
    case 'getSubComponents':  return getSubComponents(p[0], p[1]);
    case 'getAllComponents':   return getAllComponents(p[0]);
    case 'uploadDocument':    return uploadDocument(p[0], p[1]);
    case 'getDocuments':      return getDocuments(p[0], p[1]);
    case 'deleteDocument':    return deleteDocument(p[0], p[1]);
    case 'updateDocument':    return updateDocument(p[0], p[1], p[2]);

    // ── Verify / Approve ─────────────────────
    case 'verifyDocument':    return verifyDocument(p[0], p[1]);
    case 'rejectDocument':    return rejectDocument(p[0], p[1], p[2]);
    case 'approveDocument':   return approveDocument(p[0], p[1]);
    case 'rejectApproval':    return rejectApproval(p[0], p[1], p[2]);

    // ── Circulars ─────────────────────────────
    case 'getCirculars':          return getCirculars(p[0]);
    case 'acknowledgeCircular':   return acknowledgeCircular(p[0], p[1]);

    default:
      return { success: false, message: 'Unknown action: ' + action };
  }
}

function _json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
