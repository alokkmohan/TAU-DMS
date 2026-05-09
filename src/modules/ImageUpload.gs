// ─────────────────────────────────────────────────────────────
//  ImageUpload.gs  —  Bulk image upload to Drive (event-wise)
//
//  Drive structure:
//    DMS_Root/
//    └── Images/
//        └── [Event Name]/
//            ├── photo1.jpg
//            └── photo2.png
//
//  Sheet: ImageEvents
//    event_name | created_by_email | created_by_name | folder_id | created_at
// ─────────────────────────────────────────────────────────────

// ── Get or create the top-level "Images" folder under DMS root ──
function _getImagesRootFolder() {
  const root = DriveApp.getFolderById(CONFIG.ROOT_FOLDER_ID);
  const iter = root.getFoldersByName('Images');
  if (iter.hasNext()) return iter.next();
  return root.createFolder('Images');
}

// ── Get or create event sub-folder ──────────────────────────────
function _getEventFolder(eventName) {
  const imagesRoot = _getImagesRootFolder();
  const iter = imagesRoot.getFoldersByName(eventName);
  if (iter.hasNext()) return { folder: iter.next(), isNew: false };
  return { folder: imagesRoot.createFolder(eventName), isNew: true };
}

// ── Upload a single image (called once per file from frontend) ──
// params: { eventName, fileName, mimeType, fileBase64 }
function uploadSingleImage(token, params) {
  try {
    const session = requireAuth(token);
    if (!session) return errorResponse('Not authenticated.');

    const { eventName, fileName, mimeType, fileBase64 } = params || {};
    if (!eventName || !eventName.trim()) return errorResponse('Event name is required.');
    if (!fileBase64) return errorResponse('No image data received.');
    if (!fileName)  return errorResponse('File name missing.');

    // Validate mime type — images only
    const allowed = ['image/jpeg','image/jpg','image/png','image/gif','image/webp','image/heic','image/heif'];
    if (mimeType && !allowed.includes(mimeType.toLowerCase())) {
      return errorResponse('Only image files are allowed (JPG, PNG, GIF, WEBP, HEIC).');
    }

    // Decode base64 → blob
    const decoded = Utilities.base64Decode(fileBase64);
    const blob    = Utilities.newBlob(decoded, mimeType || 'image/jpeg', fileName);

    // Get / create event folder
    const { folder, isNew } = _getEventFolder(eventName.trim());

    // If brand-new event folder → log to ImageEvents sheet
    if (isNew) {
      try {
        // Check first (in case of race condition)
        const existing = getSheetData(CONFIG.TABS.IMAGE_EVENTS);
        const alreadyLogged = existing.some(function(e) {
          return (e.event_name || '').toLowerCase() === eventName.trim().toLowerCase();
        });
        if (!alreadyLogged) {
          appendRow(CONFIG.TABS.IMAGE_EVENTS, {
            event_name:       eventName.trim(),
            created_by_email: session.email,
            created_by_name:  session.name,
            folder_id:        folder.getId(),
            created_at:       new Date().toISOString()
          });
        }
      } catch(e) { Logger.log('ImageEvents log error (non-fatal): ' + e.message); }
    }

    // Upload file
    const file = folder.createFile(blob);
    // Try domain sharing; silently skip if org policy restricts it
    try {
      file.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW);
    } catch(shareErr) {
      Logger.log('Sharing note (non-fatal): ' + shareErr.message);
    }

    // Audit log
    try {
      appendRow(CONFIG.TABS.AUDIT_LOG, {
        timestamp:  new Date().toISOString(),
        user_email: session.email,
        user_name:  session.name,
        action:     'IMAGE_UPLOAD',
        doc_id:     file.getId(),
        file_name:  fileName,
        ip_note:    'event:' + eventName.trim()
      });
    } catch(e) { /* non-fatal */ }

    return successResponse({
      fileName:    file.getName(),
      fileId:      file.getId(),
      driveLink:   file.getUrl(),
      folderLink:  folder.getUrl(),
      folderName:  folder.getName()
    });

  } catch(e) {
    Logger.log('uploadSingleImage error: ' + e.message);
    return errorResponse('Upload failed: ' + e.message);
  }
}

// ── Get list of event folders — read directly from Drive ─────────────
function getImageEvents(token) {
  try {
    const session = requireAuth(token);
    if (!session) return errorResponse('Not authenticated.');

    const imagesRoot = _getImagesRootFolder();
    const folderIter = imagesRoot.getFolders();
    const events = [];

    while (folderIter.hasNext()) {
      const folder = folderIter.next();
      events.push({
        name:      folder.getName(),
        createdBy: '',                          // Drive doesn't store uploader name
        folderId:  folder.getId(),
        link:      'https://drive.google.com/drive/folders/' + folder.getId(),
        createdAt: folder.getDateCreated().toISOString()
      });
    }

    // Also try to enrich with uploader name from sheet (best-effort)
    try {
      const rows = getSheetData(CONFIG.TABS.IMAGE_EVENTS);
      if (rows && rows.length) {
        events.forEach(function(ev) {
          const match = rows.find(function(r) {
            return (r.event_name || '').toLowerCase() === ev.name.toLowerCase();
          });
          if (match) ev.createdBy = match.created_by_name || '';
        });
      }
    } catch(e) { /* sheet enrichment is optional */ }

    // Newest first
    events.sort(function(a, b) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return successResponse(events);
  } catch(e) {
    return errorResponse(e.message);
  }
}
