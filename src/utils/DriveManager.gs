function getOrCreateFolder(parentId, folderName) {
  const parent = DriveApp.getFolderById(parentId);
  const existing = parent.getFoldersByName(folderName);
  if (existing.hasNext()) return existing.next();
  return parent.createFolder(folderName);
}

// Returns folder ID for: Root / UploaderName / Year / Month
function getUploaderFolder(uploaderName) {
  const now = new Date();
  const year  = getYear(now);
  const month = getMonthName(now);

  const safeName   = uploaderName.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  const nameFolder = getOrCreateFolder(CONFIG.ROOT_FOLDER_ID, safeName);
  const yearFolder = getOrCreateFolder(nameFolder.getId(), year);
  const monthFolder= getOrCreateFolder(yearFolder.getId(), month);

  return monthFolder.getId();
}

// Save base64 file to Drive, return { fileId, fileUrl, fileName }
function saveFileToDrive(base64Data, mimeType, fileName, folderId) {
  const decoded  = Utilities.base64Decode(base64Data);
  const blob     = Utilities.newBlob(decoded, mimeType, fileName);
  const folder   = DriveApp.getFolderById(folderId);
  const file     = folder.createFile(blob);

  try {
    file.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {
    console.log('Sharing setting skipped: ' + e.message);
  }

  const fileId = file.getId();
  return {
    fileId:   fileId,
    fileUrl:  'https://drive.google.com/uc?export=download&id=' + fileId,
    fileName: file.getName()
  };
}

// For circulars — save in root/Circulars/ folder
function getCircularsFolder() {
  return getOrCreateFolder(CONFIG.ROOT_FOLDER_ID, 'Circulars').getId();
}
