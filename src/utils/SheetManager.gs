function getSheet(tabName) {
  return SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(tabName);
}

function getSheetData(tabName) {
  const sheet = getSheet(tabName);
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function appendRow(tabName, rowData) {
  const sheet = getSheet(tabName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(h => rowData[h] !== undefined ? rowData[h] : '');
  sheet.appendRow(row);
}

function findRowIndex(tabName, columnName, value) {
  const sheet = getSheet(tabName);
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return -1;
  const colIndex = data[0].indexOf(columnName);
  if (colIndex === -1) return -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][colIndex] === value) return i + 1; // 1-based row number
  }
  return -1;
}

function updateCell(tabName, rowNumber, columnName, value) {
  const sheet = getSheet(tabName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const colIndex = headers.indexOf(columnName);
  if (colIndex === -1) return;
  sheet.getRange(rowNumber, colIndex + 1).setValue(value);
}

function getUserByEmail(email) {
  const users = getSheetData(CONFIG.TABS.USERS);
  return users.find(u => u.email === email && u.is_active === true) || null;
}

function writeAuditLog(userEmail, userName, action, docId, fileName) {
  appendRow(CONFIG.TABS.AUDIT_LOG, {
    timestamp:  formatDate(new Date()),
    user_email: userEmail,
    user_name:  userName,
    action:     action,
    doc_id:     docId || '',
    file_name:  fileName || '',
    ip_note:    ''
  });
}
