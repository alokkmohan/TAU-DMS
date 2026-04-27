function uploadCircular(token, payload) {
  try {
    const session = requireAuth(token);
    requireRole(session, [CONFIG.ROLES.TEAM_LEAD, CONFIG.ROLES.SUPER_ADMIN]);

    const { title, refNumber, remarks, fileBase64, fileName, mimeType } = payload;
    if (!title || !fileBase64 || !fileName) return errorResponse('Title aur file zaroori hai.');

    const ext = fileName.split('.').pop().toLowerCase();
    if (!['pdf','doc','docx','jpg','jpeg','png'].includes(ext)) {
      return errorResponse('Sirf PDF, Word ya image allowed hai.');
    }

    const circularId  = generateCircularId();
    const autoFileName = 'Circular_' + title.replace(/\s+/g,'_').substring(0,30) + '_' + circularId + '.' + ext;
    const folderId    = getCircularsFolder();
    const driveResult = saveFileToDrive(fileBase64, mimeType, autoFileName, folderId);

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

    // Notify all managers
    _notifyManagersCircular(managers, title, circularId, session.name);

    return successResponse({ message: 'Circular upload ho gaya! Sabhi managers ko notify kar diya.' });

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
    requireRole(session, [CONFIG.ROLES.MANAGER]);

    // Check not already acknowledged
    const acks = getSheetData(CONFIG.TABS.CIRCULAR_ACK);
    const already = acks.find(a => a.circular_id === circularId && a.manager_email === session.email);
    if (already) return errorResponse('Aap pehle hi acknowledge kar chuke hain.');

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

function _notifyManagersCircular(managers, title, circularId, uploaderName) {
  try {
    managers.forEach(m => {
      GmailApp.sendEmail(
        m.email,
        CONFIG.SYSTEM_NAME + ' — Naya Circular: ' + title,
        'Namaste ' + m.name + ',\n\n' +
        uploaderName + ' ne ek naya circular share kiya hai.\n\n' +
        'Circular: ' + title + '\n\n' +
        'Kripya DMS portal par login karein aur "Maine padh liya" acknowledge karein.\n\n' +
        '— ' + CONFIG.SYSTEM_NAME
      );
    });
  } catch (e) {
    console.error('Circular notification failed:', e);
  }
}
