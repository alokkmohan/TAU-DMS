function uploadCircular(token, payload) {
  try {
    const session = requireAuth(token);
    requireRole(session, [
      CONFIG.ROLES.TEAM_LEAD,    CONFIG.ROLES.STATE_LEAD,
      CONFIG.ROLES.PROJECT_MANAGER, CONFIG.ROLES.CEO,
      CONFIG.ROLES.SUPER_ADMIN
    ]);

    const { title, refNumber, remarks, fileBase64, fileName, mimeType } = payload;
    if (!title || !fileBase64 || !fileName) return errorResponse('Title and file are required.');

    const ext = fileName.split('.').pop().toLowerCase();
    if (!['pdf','doc','docx','jpg','jpeg','png'].includes(ext)) {
      return errorResponse('Only PDF, Word, or image files are allowed.');
    }

    const circularId   = generateCircularId();
    const autoFileName = 'Circular_' + title.replace(/\s+/g,'_').substring(0,30) + '_' + circularId + '.' + ext;
    const folderId     = getCircularsFolder();
    const driveResult  = saveFileToDrive(fileBase64, mimeType, autoFileName, folderId);

    // Count active managers
    const users    = getSheetData(CONFIG.TABS.USERS);
    const managers = users.filter(u => u.role === CONFIG.ROLES.MANAGER && u.is_active === true);

    appendRow(CONFIG.TABS.CIRCULARS, {
      circular_id:    circularId,
      title:          title,
      ref_number:     refNumber || '',
      uploaded_by:    session.email,
      uploader_name:  session.name,
      drive_link:     driveResult.fileUrl,
      file_name:      autoFileName,
      remarks:        remarks || '',
      uploaded_at:    formatDate(new Date()),
      total_managers: managers.length
    });

    writeAuditLog(session.email, session.name, 'CIRCULAR_UPLOADED', circularId, autoFileName);

    // Notify all active managers
    _notifyManagersCircular(managers, title, session.name);

    return successResponse({ message: 'Circular uploaded successfully. All managers have been notified.' });

  } catch (e) {
    console.error('uploadCircular error:', e);
    return errorResponse(e.message);
  }
}

function getCirculars(token) {
  try {
    const session  = requireAuth(token);
    const circulars = getSheetData(CONFIG.TABS.CIRCULARS);
    const acks      = getSheetData(CONFIG.TABS.CIRCULAR_ACK);

    const result = circulars.reverse().map(c => {
      const ackCount = acks.filter(a => a.circular_id === c.circular_id).length;
      const myAck    = acks.find(a => a.circular_id === c.circular_id && a.manager_email === session.email);
      return {
        circular_id:    c.circular_id,
        title:          c.title,
        ref_number:     c.ref_number,
        drive_link:     c.drive_link,
        uploaded_at:    c.uploaded_at,
        uploader_name:  c.uploader_name,
        total_managers: c.total_managers,
        ack_count:      ackCount,
        acknowledged:   !!myAck
      };
    });

    return successResponse(result);
  } catch (e) {
    return errorResponse(e.message);
  }
}

function acknowledgeCircular(token, circularId) {
  try {
    const session = requireAuth(token);
    // All roles can acknowledge except the uploader themselves
    requireRole(session, [
      CONFIG.ROLES.MANAGER,      CONFIG.ROLES.TEAM_LEAD,
      CONFIG.ROLES.STATE_LEAD,   CONFIG.ROLES.PROJECT_MANAGER,
      CONFIG.ROLES.CEO,          CONFIG.ROLES.SUPER_ADMIN
    ]);

    // Check not already acknowledged
    const acks = getSheetData(CONFIG.TABS.CIRCULAR_ACK);
    const already = acks.find(a => a.circular_id === circularId && a.manager_email === session.email);
    if (already) return errorResponse('You have already acknowledged this circular.');

    appendRow(CONFIG.TABS.CIRCULAR_ACK, {
      circular_id:     circularId,
      manager_email:   session.email,
      manager_name:    session.name,
      acknowledged_at: formatDate(new Date())
    });

    writeAuditLog(session.email, session.name, 'CIRCULAR_ACK', circularId, '');
    return successResponse({ message: 'Acknowledged!' });

  } catch (e) {
    return errorResponse(e.message);
  }
}

function _notifyManagersCircular(managers, title, uploaderName) {
  try {
    managers.forEach(m => {
      GmailApp.sendEmail(
        m.email,
        'Document Management System: New Circular — ' + title,
        'Dear ' + m.name + ',\n\n' +
        uploaderName + ' has shared a new circular / government order with you.\n\n' +
        'Title: ' + title + '\n\n' +
        'Please log in to the Document Management System and acknowledge receipt under the "Govt Letters" section.\n\n' +
        'Regards,\nTechnical Assistant Unit\nEducate Girls'
      );
    });
  } catch (e) {
    console.error('Circular notification failed:', e);
  }
}
