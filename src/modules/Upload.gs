// Called from Dashboard — returns component list for dropdown
function getComponents(token) {
  try {
    requireAuth(token);
    const rows = getSheetData(CONFIG.TABS.DROPDOWNS);
    const components = [...new Set(rows.map(r => r.component))].filter(Boolean);
    return successResponse(components);
  } catch (e) {
    return errorResponse(e.message);
  }
}

// Called when component selected — returns sub-components
function getSubComponents(token, component) {
  try {
    requireAuth(token);
    const rows = getSheetData(CONFIG.TABS.DROPDOWNS);
    const subs = rows
      .filter(r => r.component === component)
      .map(r => ({ sub: r.sub_component, desc: r.description }));
    return successResponse(subs);
  } catch (e) {
    return errorResponse(e.message);
  }
}

// Main upload function
function uploadDocument(token, payload) {
  try {
    const session = requireAuth(token);

    const { component, subComponent, subject, description,
            fileBase64, fileName, mimeType } = payload;

    if (!component || !subComponent || !subject || !fileBase64 || !fileName) {
      return errorResponse('Saari required fields bharein.');
    }

    // Get file extension
    const ext = fileName.split('.').pop().toLowerCase();
    const allowedExt = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png'];
    if (!allowedExt.includes(ext)) {
      return errorResponse('Sirf PDF, Word, Excel, ya image files allowed hain.');
    }

    // Auto file name
    const autoFileName = buildFileName(component, subComponent, session.name, ext);

    // Get/create Drive folder for this user
    const folderId = getUploaderFolder(session.name);

    // Save to Drive
    const driveResult = saveFileToDrive(fileBase64, mimeType, autoFileName, folderId);

    // Save entry in Documents sheet
    const now  = new Date();
    const docId = generateDocId();

    appendRow(CONFIG.TABS.DOCUMENTS, {
      doc_id:           docId,
      uploader_email:   session.email,
      uploader_name:    session.name,
      component:        component,
      sub_component:    subComponent,
      subject:          subject,
      description:      description || '',
      file_name:        autoFileName,
      drive_link:       driveResult.fileUrl,
      year:             getYear(now),
      month:            getMonthName(now),
      status:           CONFIG.STATUS.PENDING,
      tl_verified_by:   '',
      tl_verified_at:   '',
      tl_remark:        '',
      admin_approved_by:'',
      admin_approved_at:'',
      admin_remark:     '',
      uploaded_at:      formatDate(now)
    });

    writeAuditLog(session.email, session.name, 'UPLOADED', docId, autoFileName);

    // Notify Team Lead
    _notifyTeamLead(session.name, subject, component, subComponent);

    return successResponse({
      message:  'Document successfully upload ho gaya!',
      fileName: autoFileName,
      docId:    docId
    });

  } catch (e) {
    console.error('uploadDocument error:', e);
    return errorResponse('Upload mein problem aayi: ' + e.message);
  }
}

// Fetch documents for current user (manager sees own, TL/Admin see all)
function getDocuments(token, filters) {
  try {
    const session = requireAuth(token);
    let rows = getSheetData(CONFIG.TABS.DOCUMENTS);

    // Role-based filter
    if (session.role === CONFIG.ROLES.MANAGER) {
      rows = rows.filter(r => r.uploader_email === session.email);
    }

    // Apply optional filters
    if (filters) {
      if (filters.year)      rows = rows.filter(r => r.year === filters.year);
      if (filters.month)     rows = rows.filter(r => r.month === filters.month);
      if (filters.component) rows = rows.filter(r => r.component === filters.component);
      if (filters.status)    rows = rows.filter(r => r.status === filters.status);
      if (filters.search) {
        const q = filters.search.toLowerCase();
        rows = rows.filter(r =>
          r.subject.toLowerCase().includes(q) ||
          r.file_name.toLowerCase().includes(q)
        );
      }
    }

    // Newest first
    rows.reverse();
    return successResponse(rows);

  } catch (e) {
    return errorResponse(e.message);
  }
}

function _notifyTeamLead(uploaderName, subject, component, subComponent) {
  try {
    const users = getSheetData(CONFIG.TABS.USERS);
    const tls   = users.filter(u => u.role === CONFIG.ROLES.TEAM_LEAD && u.is_active === true);
    tls.forEach(tl => {
      GmailApp.sendEmail(
        tl.email,
        CONFIG.SYSTEM_NAME + ' — Naya Document Upload',
        'Namaste ' + tl.name + ',\n\n' +
        uploaderName + ' ne ek naya document upload kiya hai.\n\n' +
        'Subject: ' + subject + '\n' +
        'Component: ' + component + ' > ' + subComponent + '\n\n' +
        'Please verify karein.\n\n— ' + CONFIG.SYSTEM_NAME
      );
    });
  } catch (e) {
    console.error('TL notification failed:', e);
  }
}
