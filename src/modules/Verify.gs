function verifyDocument(token, docId) {
  try {
    const session = requireAuth(token);
    requireRole(session, [CONFIG.ROLES.TEAM_LEAD, CONFIG.ROLES.SUPER_ADMIN]);

    const rowNum = findRowIndex(CONFIG.TABS.DOCUMENTS, 'doc_id', docId);
    if (rowNum === -1) return errorResponse('Document nahi mila.');

    const now = formatDate(new Date());
    updateCell(CONFIG.TABS.DOCUMENTS, rowNum, 'status',          CONFIG.STATUS.TL_VERIFIED);
    updateCell(CONFIG.TABS.DOCUMENTS, rowNum, 'tl_verified_by',  session.name);
    updateCell(CONFIG.TABS.DOCUMENTS, rowNum, 'tl_verified_at',  now);

    writeAuditLog(session.email, session.name, 'TL_VERIFIED', docId, '');

    _notifyUploader(docId, 'verified', session.name, '');

    return successResponse({ message: 'Document verified!' });

  } catch (e) {
    console.error('verifyDocument error:', e);
    return errorResponse(e.message === 'ACCESS_DENIED' ? 'Permission nahi hai.' : e.message);
  }
}

function rejectDocument(token, docId, remark) {
  try {
    const session = requireAuth(token);
    requireRole(session, [CONFIG.ROLES.TEAM_LEAD, CONFIG.ROLES.SUPER_ADMIN]);

    if (!remark || !remark.trim()) return errorResponse('Rejection reason zaroori hai.');

    const rowNum = findRowIndex(CONFIG.TABS.DOCUMENTS, 'doc_id', docId);
    if (rowNum === -1) return errorResponse('Document nahi mila.');

    const now = formatDate(new Date());
    updateCell(CONFIG.TABS.DOCUMENTS, rowNum, 'status',         CONFIG.STATUS.TL_REJECTED);
    updateCell(CONFIG.TABS.DOCUMENTS, rowNum, 'tl_verified_by', session.name);
    updateCell(CONFIG.TABS.DOCUMENTS, rowNum, 'tl_verified_at', now);
    updateCell(CONFIG.TABS.DOCUMENTS, rowNum, 'tl_remark',      remark.trim());

    writeAuditLog(session.email, session.name, 'TL_REJECTED', docId, remark.trim());

    _notifyUploader(docId, 'rejected', session.name, remark.trim());

    return successResponse({ message: 'Document rejected.' });

  } catch (e) {
    console.error('rejectDocument error:', e);
    return errorResponse(e.message === 'ACCESS_DENIED' ? 'Permission nahi hai.' : e.message);
  }
}

function _notifyUploader(docId, action, byName, remark) {
  try {
    const rows = getSheetData(CONFIG.TABS.DOCUMENTS);
    const doc  = rows.find(r => r.doc_id === docId);
    if (!doc) return;

    const isVerified = action === 'verified';
    const subject = CONFIG.SYSTEM_NAME + ' — Document ' + (isVerified ? 'Verified ✅' : 'Rejected ❌');
    const body =
      'Namaste,\n\n' +
      'Aapka document "' + doc.subject + '" ko ' + byName + ' ne ' +
      (isVerified ? 'verify kar diya hai.' : 'reject kar diya hai.') + '\n' +
      (remark ? '\nReason: ' + remark + '\n' : '') +
      '\n— ' + CONFIG.SYSTEM_NAME;

    GmailApp.sendEmail(doc.uploader_email, subject, body);
  } catch (e) {
    console.error('Uploader notification failed:', e);
  }
}
