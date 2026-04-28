function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateDocId() {
  const ts   = new Date().getTime().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return 'DOC-' + ts + '-' + rand;
}

function generateCircularId() {
  const ts = new Date().getTime().toString(36).toUpperCase();
  return 'CIR-' + ts;
}

function isValidDomain(email) {
  const lower = email.toLowerCase();
  return CONFIG.DOMAINS.some(d => lower.endsWith('@' + d.toLowerCase()));
}

// Returns '6A', '6B', or '' for a given state name
function getStateGroup(state) {
  if (!state) return '';
  for (const [group, states] of Object.entries(CONFIG.STATE_GROUPS)) {
    if (states.map(s => s.toLowerCase()).includes(state.toLowerCase())) {
      return group;
    }
  }
  return '';
}

function getCurrentISTTime() {
  return new Date();
}

function formatDate(date) {
  return Utilities.formatDate(date, 'Asia/Kolkata', 'dd-MM-yyyy HH:mm:ss');
}

function getMonthName(date) {
  return Utilities.formatDate(date, 'Asia/Kolkata', 'MMMM');
}

function getYear(date) {
  return Utilities.formatDate(date, 'Asia/Kolkata', 'yyyy');
}

// Build auto file name: Civil_Construction_April_2025_Gaurav.pdf
function buildFileName(component, subComponent, uploaderName, originalExt) {
  const now      = new Date();
  const month    = getMonthName(now);
  const year     = getYear(now);
  const safeName = uploaderName.replace(/\s+/g, '_');
  const safeComp = component.replace(/\s+/g, '_');
  const safeSub  = subComponent.replace(/\s+/g, '_');
  return safeComp + '_' + safeSub + '_' + month + '_' + year + '_' + safeName + '.' + originalExt;
}

function successResponse(data) {
  return { success: true, data: data };
}

function errorResponse(message) {
  return { success: false, message: message };
}
