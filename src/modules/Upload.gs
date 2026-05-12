// ── Single init call: returns components + documents together ──
function getDashboardInit(token) {
  try {
    const session    = requireAuth(token);
    const rows       = getSheetData(CONFIG.TABS.DROPDOWNS);
    const access     = _getUserComponentAccess(session.email);

    // Reuse getDocuments logic inline (avoids second requireAuth round-trip)
    const docsResult = getDocuments(token, {});
    const docs       = docsResult.success ? docsResult.data : [];

    // Components from Dropdowns sheet
    let dropdownComps = [...new Set(rows.map(r => r.component))].filter(Boolean);

    // Also collect components from actual uploaded documents (fallback if Dropdowns is empty)
    const docComps = [...new Set(docs.map(d => d.component))].filter(Boolean);

    // Merge: union of both, then apply access filter
    let allCompsSet = [...new Set([...dropdownComps, ...docComps])].sort();

    let components = allCompsSet;
    if (access !== 'ALL') {
      const allowed = access.split(',').map(s => s.trim().toLowerCase());
      components = components.filter(c => allowed.includes(c.toLowerCase()));
    }

    return successResponse({
      components:    components,
      allComponents: allCompsSet,
      subComponents: rows.map(r => ({ component: r.component, sub: r.sub_component, desc: r.description })),
      documents:     docs
    });
  } catch(e) {
    return errorResponse(e.message);
  }
}

// ── Add a new component (with its first sub-component) ─────────
function addComponent(token, component, subComponent, description) {
  try {
    const session = requireAuth(token);
    if (!component || !subComponent) {
      return errorResponse('Component name and first sub-component are required.');
    }

    const rows = getSheetData(CONFIG.TABS.DROPDOWNS);
    const compExists = rows.find(r =>
      (r.component || '').toLowerCase() === component.toLowerCase()
    );
    if (compExists) return errorResponse('Component "' + component + '" already exists. Use "Add Sub-component" instead.');

    appendRow(CONFIG.TABS.DROPDOWNS, {
      component:     component,
      sub_component: subComponent,
      description:   description || '',
      template_link: ''
    });

    // Also update dropdowns.json in Git (non-fatal if GitHub PAT not set)
    try { addComponentToGit(component, subComponent, description); } catch(e) {
      console.warn('GitHub update skipped: ' + e.message);
    }

    writeAuditLog(session.email, session.name, 'ADD_COMPONENT', '', component);
    return successResponse({ message: 'Component "' + component + '" added with sub-component "' + subComponent + '".' });

  } catch (e) {
    return errorResponse(e.message);
  }
}

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

    // Also update dropdowns.json in Git
    try { addSubComponentToGit(component, subComponent, description); } catch(e) {
      console.warn('GitHub update skipped: ' + e.message);
    }

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

// ── Get users current user can share with individually ─────────
function getShareableUsers(token) {
  try {
    const session = requireAuth(token);
    const users   = getSheetData(CONFIG.TABS.USERS).filter(u => u.is_active === true);
    const myState = session.state || '';
    const myGroup = session.state_group || getStateGroup(myState);
    let filtered  = [];

    switch (session.role) {
      case CONFIG.ROLES.TEAM_LEAD:
        filtered = users.filter(u => u.role === CONFIG.ROLES.MANAGER && u.state === myState);
        break;
      case CONFIG.ROLES.STATE_LEAD:
        filtered = users.filter(u => u.role === CONFIG.ROLES.TEAM_LEAD && u.state === myState);
        break;
      case CONFIG.ROLES.PROJECT_MANAGER: {
        const groupStates = CONFIG.STATE_GROUPS[myGroup] || [];
        filtered = users.filter(u =>
          (u.role === CONFIG.ROLES.STATE_LEAD || u.role === CONFIG.ROLES.TEAM_LEAD) &&
          groupStates.includes(u.state)
        );
        break;
      }
      case CONFIG.ROLES.CEO:
      case CONFIG.ROLES.SUPER_ADMIN:
      case CONFIG.ROLES.IT_ADMIN:
        filtered = users.filter(u =>
          u.role === CONFIG.ROLES.STATE_LEAD || u.role === CONFIG.ROLES.PROJECT_MANAGER
        );
        break;
    }

    return successResponse(filtered.map(u => ({
      email: u.email, name: u.name, role: u.role, state: u.state
    })));
  } catch (e) {
    return errorResponse(e.message);
  }
}

function _getUserComponentAccess(email) {
  const users = getSheetData(CONFIG.TABS.USERS);
  const user  = users.find(u => u.email === email);
  if (!user) return 'ALL';

  // Senior roles always see all components
  const allRoles = [
    CONFIG.ROLES.IT_ADMIN, CONFIG.ROLES.SUPER_ADMIN,
    CONFIG.ROLES.TEAM_LEAD, CONFIG.ROLES.STATE_LEAD,
    CONFIG.ROLES.PROJECT_MANAGER, CONFIG.ROLES.CEO
  ];
  if (allRoles.includes((user.role || '').toLowerCase().trim())) return 'ALL';

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

    if (session.role === CONFIG.ROLES.MANAGER) {
      docState = uploader ? (uploader.state || '') : '';
    } else {
      // Privileged roles: use targetAudience from frontend with smart defaults
      if (targetAudience && targetAudience.trim() !== '') {
        docState = targetAudience.trim();
      } else {
        const myState = uploader ? (uploader.state || '') : '';
        const myGroup = session.state_group || getStateGroup(myState);
        switch (session.role) {
          case CONFIG.ROLES.TEAM_LEAD:
            docState = 'MANAGERS:' + myState; break;
          case CONFIG.ROLES.STATE_LEAD:
            docState = 'TEAM_LEADS:' + myState; break;
          case CONFIG.ROLES.PROJECT_MANAGER:
            docState = 'STATE_LEADS:' + myGroup; break;
          default:
            docState = 'ALL';
        }
      }
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

    // ── Audience match helper ──────────────────────────────────
    function matchesAudience(ta) {
      if (!ta) return false;
      if (ta === 'ALL') return true;
      if (ta === 'EMAIL:' + session.email) return true;

      // Legacy plain state name (e.g. 'UP') or GROUP_ prefix
      if (ta.startsWith('GROUP_')) return ta === 'GROUP_' + myGroup;
      if (!ta.includes(':')) return ta.toLowerCase() === myState;

      const sep   = ta.indexOf(':');
      const type  = ta.substring(0, sep);
      const scope = ta.substring(sep + 1);
      const groupNames = Object.keys(CONFIG.STATE_GROUPS);

      switch (type) {
        case 'MANAGERS':
          return role === CONFIG.ROLES.MANAGER && scope === (session.state || '');
        case 'TEAM_LEADS':
          if (role !== CONFIG.ROLES.TEAM_LEAD) return false;
          if (scope === 'ALL') return true;
          return groupNames.includes(scope) ? scope === myGroup : scope === (session.state || '');
        case 'STATE_LEADS':
          if (role !== CONFIG.ROLES.STATE_LEAD) return false;
          return scope === 'ALL' || scope === myGroup;
        case 'PROJECT_MANAGERS':
          if (role !== CONFIG.ROLES.PROJECT_MANAGER) return false;
          return scope === 'ALL' || scope === myGroup;
      }
      return false;
    }

    // ── Visibility helper ──────────────────────────────────────
    function isVisible(r) {
      const docState = (r.state || '').trim();

      // Own uploads always visible
      if (r.uploader_email === session.email) return true;

      // Status gate: STATE_LEAD, PM, CEO only see tl_verified+
      const viewOnlyRoles = [CONFIG.ROLES.STATE_LEAD, CONFIG.ROLES.PROJECT_MANAGER, CONFIG.ROLES.CEO];
      const approvedStatuses = [CONFIG.STATUS.TL_VERIFIED, CONFIG.STATUS.ADMIN_APPROVED, CONFIG.STATUS.ARCHIVED];
      if (viewOnlyRoles.includes(role) && !approvedStatuses.includes(r.status)) return false;

      if (role === CONFIG.ROLES.SUPER_ADMIN || role === CONFIG.ROLES.IT_ADMIN) return true;

      // Manager / Communication: dusron ke verified docs bhi dekh sakte hain
      // (System ka purpose: TL verify kare toh sabko dikhe, koi bhi use kar sake)
      if (role === CONFIG.ROLES.MANAGER || role === CONFIG.ROLES.COMMUNICATION) {
        if (r.status === CONFIG.STATUS.TL_VERIFIED || r.status === CONFIG.STATUS.ADMIN_APPROVED) return true;
        return false; // dusron ke pending/rejected docs nahi dikhenge
      }

      return matchesAudience(docState);
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

    // Only uploader or super_admin/it_admin can delete
    if (doc.uploader_email !== session.email && session.role !== CONFIG.ROLES.SUPER_ADMIN && session.role !== CONFIG.ROLES.IT_ADMIN) {
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

    // Only owner or super_admin/it_admin can edit
    if (doc.uploader_email !== session.email && session.role !== CONFIG.ROLES.SUPER_ADMIN && session.role !== CONFIG.ROLES.IT_ADMIN) {
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
      u.role === CONFIG.ROLES.TEAM_LEAD &&
      u.is_active === true
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
