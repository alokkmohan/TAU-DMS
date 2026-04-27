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

function debugCheckUsersSheet() {
  const users = getSheetData(CONFIG.TABS.USERS);
  Logger.log('Total users: ' + users.length);
  users.forEach(u => {
    Logger.log('Email: ' + u.email + ' | Role: ' + u.role + ' | is_active: ' + u.is_active + ' (type: ' + typeof u.is_active + ')');
  });
}
