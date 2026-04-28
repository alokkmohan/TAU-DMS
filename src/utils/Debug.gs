// Temporary debug functions — delete after testing is done

function debugSendOTP() {
  const testEmail = 'alok.mohan@educategirls.ngo';

  Logger.log('--- Step 1: Domain check ---');
  Logger.log('isValidDomain: ' + isValidDomain(testEmail));

  Logger.log('--- Step 2: User lookup ---');
  const user = getUserByEmail(testEmail);
  Logger.log('User found: ' + JSON.stringify(user));

  if (!user) {
    Logger.log('❌ User not found in Users sheet. Check is_active column value.');
    return;
  }

  Logger.log('--- Step 3: OTP generate ---');
  const otp = generateOTP();
  Logger.log('Generated OTP: ' + otp);

  Logger.log('--- Step 4: MailApp test ---');
  try {
    GmailApp.sendEmail(testEmail, 'DMS Debug Test OTP', 'Test OTP: ' + otp);
    Logger.log('✅ Email sent successfully!');
  } catch (e) {
    Logger.log('❌ Email failed: ' + e.toString());
  }
}

function debugDriveAccess() {
  try {
    Logger.log('--- Drive Folder Access Test ---');
    const folder = DriveApp.getFolderById(CONFIG.ROOT_FOLDER_ID);
    Logger.log('✅ Root folder found: ' + folder.getName());

    const subFolder = getOrCreateFolder(CONFIG.ROOT_FOLDER_ID, 'Test_Folder');
    Logger.log('✅ Sub-folder created/found: ' + subFolder.getName());

    // Clean up test folder
    subFolder.setTrashed(true);
    Logger.log('✅ Drive access working perfectly!');
  } catch (e) {
    Logger.log('❌ Drive error: ' + e.toString());
  }
}

function debugCheckUsersSheet() {
  const users = getSheetData(CONFIG.TABS.USERS);
  Logger.log('Total users: ' + users.length);
  users.forEach(u => {
    Logger.log('Email: ' + u.email + ' | Role: ' + u.role + ' | is_active: ' + u.is_active + ' (type: ' + typeof u.is_active + ')');
  });
}

// ── Run once to add target_component column header to Documents sheet ──
function addTargetComponentColumn() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.TABS.DOCUMENTS);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (headers.includes('target_component')) {
    Logger.log('Column already exists.');
    return;
  }
  const nextCol = sheet.getLastColumn() + 1;
  sheet.getRange(1, nextCol).setValue('target_component');
  sheet.getRange(1, nextCol)
    .setBackground('#1a237e')
    .setFontColor('#ffffff')
    .setFontWeight('bold');
  Logger.log('✅ target_component column added at column ' + nextCol);
}

// ── Run once to add a new user ──
function addUser_GauravMishra() {
  const sheet = getSheet(CONFIG.TABS.USERS);
  sheet.appendRow([
    'gaurav.mishra@educategirls.ngo',
    'Gaurav Mishra',
    'manager',
    'Civil',
    '',
    formatDate(new Date()),
    true
  ]);
  Logger.log('✅ Gaurav Mishra added successfully!');
}
