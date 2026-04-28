// ── Add a new sub-component + description to Dropdowns sheet ──
function addSubComponent(token, component, subComponent, description) {
  try {
    const session = requireAuth(token);
    if (!component || !subComponent) {
      return errorResponse('Component and sub-component name are required.');
    }

    const rows   = getSheetData(CONFIG.TABS.DROPDOWNS);
    const exists = rows.find(r =>
      (r.component     || '').toLowerCase() === component.toLowerCase() &&
      (r.sub_component || '').toLowerCase() === subComponent.toLowerCase()
    );
    if (exists) return errorResponse('This sub-component already exists for ' + component + '.');

    appendRow(CONFIG.TABS.DROPDOWNS, {
      component:     component,
      sub_component: subComponent,
      description:   description || '',
      template_link: ''
    });

    writeAuditLog(session.email, session.name, 'ADD_SUB_COMPONENT', '', subComponent);
    return successResponse({ message: 'Sub-component "' + subComponent + '" added to ' + component + '.' });

  } catch (e) {
    return errorResponse(e.message);
  }
}

// ── Component dropdowns (filtered by user's component_access) ──
function getComponents(token) {
  try {
    const session = requireAuth(token);
    const rows    = getSheetData(CONFIG.TABS.DROPDOWNS);
    const access  = _getUserComponentAccess(session.email);

    let components = [...new Set(rows.map(r => r.component))].filter(Boolean);
    if (access !== 'ALL') {
      const allowed = access.split(',').map(s => s.trim().toLowerCase());
      components = components.filter(c => allowed.includes(c.toLowerCase()));
    }
    return successResponse(components);
  } catch (e) {
    return errorResponse(e.message);
  }
}

function getSubComponents(token, component) {
  try {
    const session = requireAuth(token);
    const access  = _getUserComponentAccess(session.email);

    if (access !== 'ALL') {
      const allowed = access.split(',').map(s => s.trim().toLowerCase());
      if (!allowed.includes(component.toLowerCase())) {
        return errorResponse('You do not have access to this component.');
      }
    }

    const rows = getSheetData(CONFIG.TABS.DROPDOWNS);
    const subs = rows
      .filter(r => r.component === component)
      .map(r => ({ sub: r.sub_component, desc: r.description }));
    return successResponse(subs);
  } catch (e) {
    return errorResponse(e.message);
  }
}

// All components — for target_component dropdown (TL / Admin)
function getAllComponents(token) {
  try {
    requireAuth(token);
    const rows = getSheetData(CONFIG.TABS.DROPDOWNS);
    const components = [...new Set(rows.map(r => r.component))].filter(Boolean);
    return successResponse(components);
  } catch (e) {
    return errorResponse(e.message);
  }
}

function _getUserComponentAccess(email) {
  const users  = getSheetData(CONFIG.TABS.USERS);
  const user   = users.find(u => u.email === email);
  if (!user) return 'ALL';
  const access = user.component_access || '';
  if (!access || access.toString().trim().toUpperCase() === 'ALL') return 'ALL';
  return access.toString().trim();
}

// ── Main upload ────────────────────────────────────────────────
function uploadDocument(token, payload) {
  try {
    const session = requireAuth(token);

    const { component, subComponent, subject, description,
            fileBase64, fileName, mimeType, targetComponent,
            targetAudience } = payload;

    if (!component || !subComponent || !subject || !fileBase64 || !fileName) {
      return errorResponse('Please fill all required fields.');
    }

    const ext        = fileName.split('.').pop().toLowerCase();
    const allowedExt = ['pdf','doc','docx','xls','xlsx','csv','ppt','pptx','jpg','jpeg','png'];
    if (!allowedExt.includes(ext)) {
      return errorResponse('Allowed formats: PDF, Word, Excel, CSV, PowerPoint, Image (JPG/PNG)');
    }
    if (fileBase64.length > 13700000) {
      return errorResponse('File size exceeds 10MB. Please upload a smaller file.');
    }

    const isManager    = session.role === CONFIG.ROLES.MANAGER;
    const isPrivileged = !isManager;

    // Determine document state/audience based on role
    let docState = '';
    const users    = getSheetData(CONFIG.TABS.USERS);
    const uploader = users.find(u => u.email === session.email);

    if (session.role === CONFIG.ROLES.MANAGER ||
        session.role === CONFIG.ROLES.TEAM_LEAD ||
        session.role === CONFIG.ROLES.STATE_LEAD) {
      // Own state — so state-level visibility
      docState = uploader ? (uploader.state || '') : '';

    } else if (session.role === CONFIG.ROLES.PROJECT_MANAGER) {
      // Group-level visibility (e.g. GROUP_6A)
      docState = session.state_group ? ('GROUP_' + session.state_group) : '';

    } else if (session.role === CONFIG.ROLES.CEO || session.role === CONFIG.ROLES.SUPER_ADMIN) {
      // Admin selects audience: ALL / GROUP_6A / GROUP_6B / specific state
      docState = targetAudience || 'ALL';
    }

    // Optional component-level sharing
    const resolvedTarget = isPrivileged ? (targetComponent || '') : '';

    // Auto file name
    const autoFileName = buildFileName(component, subComponent, session.name, ext);

    // Drive folder: Root / UploaderName / Year / Month
    const folderId    = getUploaderFolder(session.name);
    const driveResult = saveFileToDrive(fileBase64, mimeType, autoFileName, folderId);

    const now   = new Date();
    const docId = generateDocId();

    // Privileged roles bypass the approval workflow
    const status = isManager ? CONFIG.STATUS.PENDING : CONFIG.STATUS.ADMIN_APPROVED;

    appendRow(CONFIG.TABS.DOCUMENTS, {
      doc_id:            docId,
      uploader_email:    session.email,
      uploader_name:     session.name,
      component:         component,
      sub_component:     subComponent,
      subject:           subject,
      description:       description || '',
      file_name:         autoFileName,
      drive_link:        driveResult.fileUrl,
      year:              getYear(now),
      month:             getMonthName(now),
      status:            status,
      tl_verified_by:    isPrivileged ? session.name : '',
      tl_verified_at:    isPrivileged ? formatDate(now) : '',
      tl_remark:         '',
      admin_approved_by: isPrivileged ? session.name : '',
      admin_approved_at: isPrivileged ? formatDate(now) : '',
      admin_remark:      '',
      uploaded_at:       formatDate(now),
      target_component:  resolvedTarget,
      state:             docState
    });

    writeAuditLog(session.email, session.name, 'UPLOADED', docId, autoFileName);

    // Notify TL only when a manager uploads
    if (isManager) {
      _notifyTeamLead(session.name, subject, component, subComponent, docState);
    }

    return successResponse({
      message:  'Document uploaded successfully!',
      fileName: autoFileName,
      docId:    docId
    });

  } catch (e) {
    console.error('uploadDocument error: ' + e.message + ' | ' + e.stack);
    return errorResponse('Upload failed: ' + e.message);
  }
}

// ── Fetch documents (role + state filtered) ────────────────────
function getDocuments(token, filters) {
  try {
    const session  = requireAuth(token);
    let   rows     = getSheetData(CONFIG.TABS.DOCUMENTS);
    const role     = session.role;
    const myState  = (session.state || '').toLowerCase();
    const myGroup  = session.state_group || getStateGroup(session.state || '');

    // ── Visibility helper ──────────────────────────────────────
    function isVisible(r) {
      const docState = (r.state || '').trim();

      if (role === CONFIG.ROLES.MANAGER) {
        // 1. Own uploads
        if (r.uploader_email === session.email) return true;
        // 2. Docs shared by component (target_component)
        const userAccess = _getUserComponentAccess(session.email);
        const tc = (r.target_component || '').trim().toUpperCase();
        if (tc === 'ALL') return true;
        if (tc && userAccess !== 'ALL' && tc === userAccess.toUpperCase()) return true;
        if (tc && userAccess === 'ALL') return true;
        // 3. Privileged-role broadcast docs visible to this manager
        if (docState === 'ALL') return true;
        if (myGroup && docState === 'GROUP_' + myGroup) return true;
        if (docState && docState.toLowerCase() === myState) return true;
        return false;
      }

      if (role === CONFIG.ROLES.TEAM_LEAD || role === CONFIG.ROLES.STATE_LEAD) {
        // All docs in their state + group broadcasts + global
        if (docState === 'ALL') return true;
        if (myGroup && docState === 'GROUP_' + myGroup) return true;
        return docState.toLowerCase() === myState;
      }

      if (role === CONFIG.ROLES.PROJECT_MANAGER) {
        // All docs in their state_group states + their own group broadcast + global
        const groupStates = (CONFIG.STATE_GROUPS[myGroup] || []).map(s => s.toLowerCase());
        if (docState === 'ALL') return true;
        if (docState === 'GROUP_' + myGroup) return true;
        return groupStates.includes(docState.toLowerCase());
      }

      // CEO / super_admin → see everything
      return true;
    }

    rows = rows.filter(isVisible);

    // Optional filters
    if (filters) {
      if (filters.year)      rows = rows.filter(r => r.year      === filters.year);
      if (filters.month)     rows = rows.filter(r => r.month     === filters.month);
      if (filters.component) rows = rows.filter(r => r.component === filters.component);
      if (filters.status)    rows = rows.filter(r => r.status    === filters.status);
      if (filters.state)     rows = rows.filter(r => r.state     === filters.state);
      if (filters.search) {
        const q = filters.search.toLowerCase();
        rows = rows.filter(r =>
          (r.subject   || '').toLowerCase().includes(q) ||
          (r.file_name || '').toLowerCase().includes(q)
        );
      }
    }

    rows.reverse();
    return successResponse(rows);
  } catch (e) {
    return errorResponse(e.message);
  }
}

// ── Delete document (only allowed if status is 'pending') ──────
function deleteDocument(token, docId) {
  try {
    const session = requireAuth(token);

    const rows   = getSheetData(CONFIG.TABS.DOCUMENTS);
    const doc    = rows.find(r => r.doc_id === docId);
    if (!doc) return errorResponse('Document not found.');

    // Only uploader or super_admin can delete
    if (doc.uploader_email !== session.email && session.role !== CONFIG.ROLES.SUPER_ADMIN) {
      return errorResponse('You can only delete your own documents.');
    }

    // Lock rule: managers cannot delete after TL has acted
    // Privileged roles (TL/SL/PM/CEO) bypass this — their uploads have no approval workflow
    const isManagerDoc = session.role === CONFIG.ROLES.MANAGER;
    if (isManagerDoc && CONFIG.LOCKED_STATUSES.includes(doc.status)) {
      return errorResponse(
        'This document is locked and cannot be deleted. ' +
        'Once a Team Lead has verified or rejected a document, it becomes a permanent record.'
      );
    }

    // Find and delete the row in Sheets
    const sheet   = getSheet(CONFIG.TABS.DOCUMENTS);
    const data    = sheet.getDataRange().getValues();
    const headers = data[0];
    const docIdCol = headers.indexOf('doc_id');

    for (let i = 1; i < data.length; i++) {
      if (data[i][docIdCol] === docId) {
        sheet.deleteRow(i + 1);
        break;
      }
    }

    writeAuditLog(session.email, session.name, 'DELETED', docId, doc.file_name);
    return successResponse({ message: 'Document deleted successfully.' });

  } catch (e) {
    return errorResponse(e.message);
  }
}

// ── Edit document (subject / description / sub_component) ──────
function updateDocument(token, docId, updates) {
  try {
    const session = requireAuth(token);

    const rows = getSheetData(CONFIG.TABS.DOCUMENTS);
    const doc  = rows.find(r => r.doc_id === docId);
    if (!doc) return errorResponse('Document not found.');

    // Only owner or super_admin can edit
    if (doc.uploader_email !== session.email && session.role !== CONFIG.ROLES.SUPER_ADMIN) {
      return errorResponse('You can only edit your own documents.');
    }

    // Managers cannot edit after TL has acted
    if (session.role === CONFIG.ROLES.MANAGER && CONFIG.LOCKED_STATUSES.includes(doc.status)) {
      return errorResponse(
        'This document is locked. Once a Team Lead has acted on it, it becomes a permanent record.'
      );
    }

    const rowNum = findRowIndex(CONFIG.TABS.DOCUMENTS, 'doc_id', docId);
    if (rowNum === -1) return errorResponse('Document not found.');

    if (updates.subject     !== undefined && updates.subject.trim()) {
      updateCell(CONFIG.TABS.DOCUMENTS, rowNum, 'subject',       updates.subject.trim());
    }
    if (updates.description !== undefined) {
      updateCell(CONFIG.TABS.DOCUMENTS, rowNum, 'description',   updates.description.trim());
    }
    if (updates.subComponent) {
      updateCell(CONFIG.TABS.DOCUMENTS, rowNum, 'sub_component', updates.subComponent);
    }

    writeAuditLog(session.email, session.name, 'UPDATED', docId, doc.file_name);
    return successResponse({ message: 'Document updated successfully.' });

  } catch (e) {
    return errorResponse(e.message);
  }
}

function _notifyTeamLead(uploaderName, subject, component, subComponent, state) {
  try {
    const users = getSheetData(CONFIG.TABS.USERS);
    const tls   = users.filter(u =>
      (u.role === CONFIG.ROLES.TEAM_LEAD || u.role === CONFIG.ROLES.STATE_LEAD) &&
      u.is_active === true &&
      (!state || (u.state || '').toLowerCase() === state.toLowerCase())
    );
    tls.forEach(tl => {
      GmailApp.sendEmail(
        tl.email,
        'Document Management System: New Document Uploaded',
        'Dear ' + tl.name + ',\n\n' +
        uploaderName + ' has uploaded a new document for your review.\n\n' +
        'Subject   : ' + subject + '\n' +
        'Component : ' + component + ' > ' + subComponent + '\n' +
        (state ? 'State     : ' + state + '\n' : '') +
        '\nPlease log in to verify the document.\n\n' +
        'Regards,\nTechnical Assistant Unit\nEducate Girls'
      );
    });
  } catch (e) {
    console.error('TL notification failed:', e);
  }
}
