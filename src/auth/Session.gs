// Session token stored in PropertiesService (script-scoped)
// Key: SESSION_<uuid>  →  JSON { email, role, name, state, state_group, createdAt }
const SESSION_PREFIX   = 'SESSION_';
const SESSION_TTL_HOURS = 8;

function _createSession(email, role, name, state, state_group, component) {
  const token   = Utilities.getUuid();
  const payload = JSON.stringify({
    email:       email,
    role:        role,
    name:        name,
    state:       state       || '',
    state_group: state_group || '',
    component:   component   || '',
    createdAt:   new Date().getTime()
  });
  PropertiesService.getScriptProperties().setProperty(SESSION_PREFIX + token, payload);
  return token;
}

function validateSession(token) {
  if (!token) return null;
  const raw = PropertiesService.getScriptProperties().getProperty(SESSION_PREFIX + token);
  if (!raw) return null;

  const session = JSON.parse(raw);
  const ageMs   = new Date().getTime() - session.createdAt;
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

function requireAuth(token) {
  const session = validateSession(token);
  if (!session) throw new Error('SESSION_EXPIRED');
  return session;
}

function requireRole(session, allowedRoles) {
  // it_admin has all super_admin rights — normalize before checking
  const effectiveRole = (session.role === CONFIG.ROLES.IT_ADMIN)
    ? CONFIG.ROLES.SUPER_ADMIN
    : session.role;
  if (!allowedRoles.includes(effectiveRole)) {
    throw new Error('ACCESS_DENIED');
  }
}

function logoutUser(token) {
  try {
    destroySession(token);
    return successResponse({ message: 'Logout successful.' });
  } catch (e) {
    return errorResponse('Logout failed. Please try again.');
  }
}
