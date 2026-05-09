// ── TL / State Lead: Verify a pending document ────────────────
function verifyDocument(token, docId) {
  try {
    const session = requireAuth(token);
    requireRole(session, [
      CONFIG.ROLES.TEAM_LEAD, CONFIG.ROLES.SUPER_ADMIN
      // it_admin → auto-maps to super_admin via requireRole normalization
    ]);

    const rowNum = findRowIndex(CONFIG.TABS.DOCUMENTS, 'doc_id', docId);
    if (rowNum === -1) return errorResponse('Document not found.');

    // Only pending docs can be verified
    const rows  = getSheetData(CONFIG.TABS.DOCUMENTS);
    const doc   = rows.find(r => r.doc_id === docId);
    if (doc.status !== CONFIG.STATUS.PENDING) {
      return errorResponse('Only pending documents can be verified.');
    }

    const now = formatDate(new Date());
    updateCell(CONFIG.TABS.DOCUMENTS, rowNum, 'status',         CONFIG.STATUS.TL_VERIFIED);
    updateCell(CONFIG.TABS.DOCUMENTS, rowNum, 'tl_verified_by', session.name);
    updateCell(CONFIG.TABS.DOCUMENTS, rowNum, 'tl_verified_at', now);

    writeAuditLog(session.email, session.name, 'TL_VERIFIED', docId, '');
    _notifyUploader(doc, 'verified', session.name, '');

    return successResponse({ message: 'Document verified successfully.' });
  } catch (e) {
    return errorResponse(e.message === 'ACCESS_DENIED' ? 'You do not have permission to verify documents.' : e.message);
  }
}

// ── TL / State Lead: Reject a pending document ─────────────────
function rejectDocument(token, docId, remark) {
  try {
    const session = requireAuth(token);
    requireRole(session, [
      CONFIG.ROLES.TEAM_LEAD, CONFIG.ROLES.SUPER_ADMIN
      // it_admin → auto-maps to super_admin via requireRole normalization
    ]);

    if (!remark || !remark.trim()) return errorResponse('Rejection reason is required.');

    const rowNum = findRowIndex(CONFIG.TABS.DOCUMENTS, 'doc_id', docId);
    if (rowNum === -1) return errorResponse('Document not found.');

    const rows = getSheetData(CONFIG.TABS.DOCUMENTS);
    const doc  = rows.find(r => r.doc_id === docId);
    if (doc.status !== CONFIG.STATUS.PENDING) {
      return errorResponse('Only pending documents can be rejected.');
    }

    const now = formatDate(new Date());
    updateCell(CONFIG.TABS.DOCUMENTS, rowNum, 'status',         CONFIG.STATUS.TL_REJECTED);
    updateCell(CONFIG.TABS.DOCUMENTS, rowNum, 'tl_verified_by', session.name);
    updateCell(CONFIG.TABS.DOCUMENTS, rowNum, 'tl_verified_at', now);
    updateCell(CONFIG.TABS.DOCUMENTS, rowNum, 'tl_remark',      remark.trim());

    writeAuditLog(session.email, session.name, 'TL_REJECTED', docId, remark.trim());
    _notifyUploader(doc, 'rejected', session.name, remark.trim());

    return successResponse({ message: 'Document rejected.' });
  } catch (e) {
    return errorResponse(e.message === 'ACCESS_DENIED' ? 'You do not have permission to reject documents.' : e.message);
  }
}

// ── Super Admin only: Final approval (TL verify is the normal final step) ──
function approveDocument(token, docId) {
  try {
    const session = requireAuth(token);
    requireRole(session, [CONFIG.ROLES.SUPER_ADMIN]);

    const rowNum = findRowIndex(CONFIG.TABS.DOCUMENTS, 'doc_id', docId);
    if (rowNum === -1) return errorResponse('Document not found.');

    const rows = getSheetData(CONFIG.TABS.DOCUMENTS);
    const doc  = rows.find(r => r.doc_id === docId);
    if (doc.status !== CONFIG.STATUS.TL_VERIFIED) {
      return errorResponse('Only TL-verified documents can be approved.');
    }

    const now = formatDate(new Date());
    updateCell(CONFIG.TABS.DOCUMENTS, rowNum, 'status',            CONFIG.STATUS.ADMIN_APPROVED);
    updateCell(CONFIG.TABS.DOCUMENTS, rowNum, 'admin_approved_by', session.name);
    updateCell(CONFIG.TABS.DOCUMENTS, rowNum, 'admin_approved_at', now);

    writeAuditLog(session.email, session.name, 'ADMIN_APPROVED', docId, '');
    _notifyUploader(doc, 'approved', session.name, '');

    return successResponse({ message: 'Document approved successfully.' });
  } catch (e) {
    return errorResponse(e.message === 'ACCESS_DENIED' ? 'You do not have permission to approve documents.' : e.message);
  }
}

// ── Super Admin only: Reject after TL verification ────────────
function rejectApproval(token, docId, remark) {
  try {
    const session = requireAuth(token);
    requireRole(session, [CONFIG.ROLES.SUPER_ADMIN]);

    if (!remark || !remark.trim()) return errorResponse('Rejection reason is required.');

    const rowNum = findRowIndex(CONFIG.TABS.DOCUMENTS, 'doc_id', docId);
    if (rowNum === -1) return errorResponse('Document not found.');

    const rows = getSheetData(CONFIG.TABS.DOCUMENTS);
    const doc  = rows.find(r => r.doc_id === docId);
    if (doc.status !== CONFIG.STATUS.TL_VERIFIED) {
      return errorResponse('Only TL-verified documents can be rejected at this stage.');
    }

    const now = formatDate(new Date());
    updateCell(CONFIG.TABS.DOCUMENTS, rowNum, 'status',            CONFIG.STATUS.ADMIN_REJECTED);
    updateCell(CONFIG.TABS.DOCUMENTS, rowNum, 'admin_approved_by', session.name);
    updateCell(CONFIG.TABS.DOCUMENTS, rowNum, 'admin_approved_at', now);
    updateCell(CONFIG.TABS.DOCUMENTS, rowNum, 'admin_remark',      remark.trim());

    writeAuditLog(session.email, session.name, 'ADMIN_REJECTED', docId, remark.trim());
    _notifyUploader(doc, 'admin_rejected', session.name, remark.trim());

    return successResponse({ message: 'Document rejected.' });
  } catch (e) {
    return errorResponse(e.message === 'ACCESS_DENIED' ? 'You do not have permission.' : e.message);
  }
}

// ── Email notification to uploader ────────────────────────────
function _notifyUploader(doc, action, byName, remark) {
  try {
    const messages = {
      verified:       { subj: 'Document Verified',          body: 'has been verified by' },
      rejected:       { subj: 'Document Rejected',          body: 'has been rejected by' },
      approved:       { subj: 'Document Approved',          body: 'has been approved by' },
      admin_rejected: { subj: 'Document Rejected (Review)', body: 'was rejected during review by' }
    };
    const m = messages[action] || { subj: 'Document Update', body: 'was updated by' };

    GmailApp.sendEmail(
      doc.uploader_email,
      'Document Management System: ' + m.subj,
      'Dear ' + doc.uploader_name + ',\n\n' +
      'Your document "' + doc.subject + '" ' + m.body + ' ' + byName + '.\n' +
      (remark ? '\nRemark: ' + remark + '\n' : '') +
      '\nPlease log in to the Document Management System to view the details.\n\n' +
      'Regards,\nTechnical Assistant Unit\nEducate Girls'
    );
  } catch (e) {
    console.error('Uploader notification failed:', e);
  }
}
