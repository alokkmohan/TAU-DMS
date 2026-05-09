// ─────────────────────────────────────────────────────────────
//  ImageUpload.gs  —  Bulk image upload to Drive (event-wise)
//
//  Drive structure:
//    DMS_Root/
//    └── Images/
//        └── [Event Name]/
//            ├── photo1.jpg
//            └── photo2.png
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
  if (iter.hasNext()) return iter.next();
  return imagesRoot.createFolder(eventName);
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
    const folder = _getEventFolder(eventName.trim());

    // Upload file
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

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

// ── Get list of event folders (for dropdown / history) ──────────
function getImageEvents(token) {
  try {
    const session = requireAuth(token);
    if (!session) return errorResponse('Not authenticated.');

    const imagesRoot = _getImagesRootFolder();
    const iter = imagesRoot.getFolders();
    const events = [];
    while (iter.hasNext()) {
      const f = iter.next();
      events.push({
        name:      f.getName(),
        link:      f.getUrl(),
        createdAt: f.getDateCreated().toISOString()
      });
    }
    // Sort newest first
    events.sort(function(a,b){ return new Date(b.createdAt) - new Date(a.createdAt); });
    return successResponse(events);
  } catch(e) {
    return errorResponse(e.message);
  }
}
