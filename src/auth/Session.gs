// Session token stored in PropertiesService (user-scoped)
// Key format: SESSION_<token>  →  JSON { email, role, name, createdAt }
const SESSION_PREFIX = 'SESSION_';
const SESSION_TTL_HOURS = 8;

function _createSession(email, role, name) {
  const token = Utilities.getUuid();
  const payload = JSON.stringify({
    email:     email,
    role:      role,
    name:      name,
    createdAt: new Date().getTime()
  });
  PropertiesService.getScriptProperties().setProperty(SESSION_PREFIX + token, payload);
  return token;
}

function validateSession(token) {
  if (!token) return null;
  const raw = PropertiesService.getScriptProperties().getProperty(SESSION_PREFIX + token);
  if (!raw) return null;

  const session = JSON.parse(raw);
  const ageMs = new Date().getTime() - session.createdAt;
  if (ageMs > SESSION_TTL_HOURS * 60 * 60 * 1000) {
    PropertiesService.getScriptProperties().deleteProperty(SESSION_PREFIX + token);
    return null;
  }
  return session;
}

function destroySession(token) {
  if (!token) return;
  PropertiesService.getScriptProperties().deleteProperty(SESSION_PREFIX + token);
}

// Call this at the top of every server-side action function
function requireAuth(token) {
  const session = validateSession(token);
  if (!session) throw new Error('SESSION_EXPIRED');
  return session;
}

// Check role permission — throws if not allowed
function requireRole(session, allowedRoles) {
  if (!allowedRoles.includes(session.role)) {
    throw new Error('ACCESS_DENIED');
  }
}

function logoutUser(token) {
  try {
    destroySession(token);
    return successResponse({ message: 'Logout successful.' });
  } catch (e) {
    return errorResponse('Logout mein problem aayi.');
  }
}
