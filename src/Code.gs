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
  // Public dropdowns endpoint — no auth needed (just category names)
  if (e && e.parameter && e.parameter.action === 'dropdowns') {
    try {
      const rows    = getSheetData(CONFIG.TABS.DROPDOWNS);
      const compMap = {};
      rows.forEach(function(r) {
        const comp = (r.component     || '').trim();
        const sub  = (r.sub_component || '').trim();
        const desc = (r.description   || '').trim();
        if (!comp || !sub) return;
        if (!compMap[comp]) compMap[comp] = [];
        compMap[comp].push({ sub: sub, desc: desc });
      });
      const components = Object.keys(compMap).sort().map(function(c) {
        return { component: c, sub_components: compMap[c] };
      });
      return ContentService
        .createTextOutput(JSON.stringify({ version: 1, components: components }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch(err) {
      return _json({ version: 1, components: [] });
    }
  }
  return _json({ status: 'ok', app: 'DMS — TAU', version: '2.1' });
}

function _route(action, p) {
  switch (action) {
    // ── Auth ──────────────────────────────────
    case 'sendOTP':           return sendOTP(p[0]);
    case 'verifyOTP':         return verifyOTP(p[0], p[1]);
    case 'logoutUser':        return logoutUser(p[0]);

    // ── Dashboard init (single call) ─────────
    case 'getDashboardInit':  return getDashboardInit(p[0]);

    // ── Upload / Documents ────────────────────
    case 'getComponents':     return getComponents(p[0]);
    case 'getSubComponents':  return getSubComponents(p[0], p[1]);
    case 'getAllComponents':   return getAllComponents(p[0]);
    case 'getShareableUsers':  return getShareableUsers(p[0]);
    case 'addComponent':      return addComponent(p[0], p[1], p[2], p[3]);
    case 'addSubComponent':   return addSubComponent(p[0], p[1], p[2], p[3]);
    case 'uploadDocument':    return uploadDocument(p[0], p[1]);
    case 'getDocuments':      return getDocuments(p[0], p[1]);
    case 'deleteDocument':    return deleteDocument(p[0], p[1]);
    case 'updateDocument':    return updateDocument(p[0], p[1], p[2]);

    // ── Verify / Approve ─────────────────────
    case 'verifyDocument':    return verifyDocument(p[0], p[1]);
    case 'rejectDocument':    return rejectDocument(p[0], p[1], p[2]);
    case 'approveDocument':   return approveDocument(p[0], p[1]);
    case 'rejectApproval':    return rejectApproval(p[0], p[1], p[2]);

    // ── Circulars / Govt Letters ──────────────
    case 'uploadCircular':        return uploadCircular(p[0], p[1]);
    case 'getCirculars':          return getCirculars(p[0]);
    case 'acknowledgeCircular':   return acknowledgeCircular(p[0], p[1]);

    // ── Admin / Git utilities ─────────────────────────────────
    case 'migrateDropdowns': return migrateDropdowns(p[0]);

    default:
      return { success: false, message: 'Unknown action: ' + action };
  }
}

function _json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
