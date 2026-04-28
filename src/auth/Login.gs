function sendOTP(email) {
  try {
    email = email.trim().toLowerCase();

    if (!isValidDomain(email)) {
      return errorResponse('Only ' + CONFIG.DOMAIN + ' email addresses are allowed.');
    }

    const user = getUserByEmail(email);
    if (!user) {
      return errorResponse('This email is not registered. Please contact the administrator.');
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

    return successResponse({ message: 'OTP sent successfully to your email.' });

  } catch (e) {
    console.error('sendOTP error:', e);
    return errorResponse('Failed to send OTP. Please try again.');
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
      return errorResponse('Invalid or expired OTP. Please request a new one.');
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
    return errorResponse('Verification failed. Please try again.');
  }
}

function _sendOTPEmail(email, name, otp) {
  const subject = 'Document Management System: Your Login OTP';
  const body =
    'Dear ' + name + ',\n\n' +
    'You have requested a One-Time Password (OTP) to log in to the Document Management System.\n\n' +
    'Your OTP is:\n\n' +
    '        ' + otp + '\n\n' +
    'This OTP is valid for ' + CONFIG.OTP_EXPIRY_MINUTES + ' minutes. Please do not share it with anyone.\n\n' +
    'If you did not request this OTP, please ignore this email.\n\n' +
    'Regards,\n' +
    'Technical Assistant Unit\n' +
    'Educate Girls';

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
