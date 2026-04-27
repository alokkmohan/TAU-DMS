function sendOTP(email) {
  try {
    email = email.trim().toLowerCase();

    if (!isValidDomain(email)) {
      return errorResponse('Sirf ' + CONFIG.DOMAIN + ' email allowed hai.');
    }

    const user = getUserByEmail(email);
    if (!user) {
      return errorResponse('Aapka email registered nahi hai. Admin se contact karein.');
    }

    // Clear old OTPs for this email
    _clearOldOTPs(email);

    const otp = generateOTP();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + CONFIG.OTP_EXPIRY_MINUTES * 60 * 1000);

    appendRow(CONFIG.TABS.OTP_STORE, {
      email:      email,
      otp:        otp,
      expires_at: formatDate(expiresAt),
      used:       false
    });

    _sendOTPEmail(email, user.name, otp);

    writeAuditLog(email, user.name, 'OTP_SENT', '', '');

    return successResponse({ message: 'OTP aapke email par bheja gaya hai.' });

  } catch (e) {
    console.error('sendOTP error:', e);
    return errorResponse('OTP bhejne mein problem aayi. Dobara try karein.');
  }
}

function verifyOTP(email, enteredOTP) {
  try {
    email = email.trim().toLowerCase();
    enteredOTP = enteredOTP.trim();

    const sheet = getSheet(CONFIG.TABS.OTP_STORE);
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return errorResponse('Invalid OTP.');

    const headers = data[0];
    const emailCol   = headers.indexOf('email');
    const otpCol     = headers.indexOf('otp');
    const expiresCol = headers.indexOf('expires_at');
    const usedCol    = headers.indexOf('used');

    const now = new Date();
    let matchRow = -1;

    for (let i = data.length - 1; i >= 1; i--) {
      const row = data[i];
      if (row[emailCol] !== email) continue;
      if (row[usedCol] === true) continue;

      const expiresAt = new Date(row[expiresCol]);
      if (now > expiresAt) continue;

      if (row[otpCol].toString() === enteredOTP) {
        matchRow = i + 1;
        break;
      }
    }

    if (matchRow === -1) {
      return errorResponse('OTP galat hai ya expire ho gaya. Dobara OTP mangaein.');
    }

    // Mark OTP as used
    sheet.getRange(matchRow, usedCol + 1).setValue(true);

    const user = getUserByEmail(email);
    const token = _createSession(email, user.role, user.name);

    writeAuditLog(email, user.name, 'LOGIN_SUCCESS', '', '');

    return successResponse({
      token: token,
      role:  user.role,
      name:  user.name
    });

  } catch (e) {
    console.error('verifyOTP error:', e);
    return errorResponse('Verification mein problem aayi. Dobara try karein.');
  }
}

function _sendOTPEmail(email, name, otp) {
  const subject = CONFIG.SYSTEM_NAME + ' — Login OTP';
  const body =
    'Namaste ' + name + ',\n\n' +
    'Aapka Login OTP hai:\n\n' +
    '  ' + otp + '\n\n' +
    'Yeh OTP ' + CONFIG.OTP_EXPIRY_MINUTES + ' minute mein expire ho jaayega.\n' +
    'Kisi ke saath share mat karein.\n\n' +
    '— ' + CONFIG.SYSTEM_NAME;

  GmailApp.sendEmail(email, subject, body);
}

function _clearOldOTPs(email) {
  const sheet = getSheet(CONFIG.TABS.OTP_STORE);
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return;
  const emailCol = data[0].indexOf('email');
  const usedCol  = data[0].indexOf('used');
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][emailCol] === email && data[i][usedCol] !== true) {
      sheet.getRange(i + 1, usedCol + 1).setValue(true);
    }
  }
}
