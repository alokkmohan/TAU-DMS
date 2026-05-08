// ─────────────────────────────────────────────────────────────
//  GitHubManager.gs  —  Read/Write dropdowns.json via GitHub API
//
//  Setup: GAS Script Editor → Project Settings → Script Properties
//  Add property:  GITHUB_PAT  →  your GitHub Personal Access Token
//  PAT needs: Contents (Read & Write) permission on this repo
// ─────────────────────────────────────────────────────────────

const GITHUB_REPO   = 'alokkmohan/TAU-DMS';
const GITHUB_FILE   = 'dropdowns.json';
const GITHUB_BRANCH = 'main';
const GITHUB_API    = 'https://api.github.com';

// ── Get stored PAT from Script Properties ────────────────────
function _getGitHubToken() {
  const token = PropertiesService.getScriptProperties().getProperty('GITHUB_PAT');
  if (!token) throw new Error('GITHUB_PAT not set in Script Properties.');
  return token;
}

function _githubHeaders() {
  return {
    'Authorization': 'Bearer ' + _getGitHubToken(),
    'Accept':        'application/vnd.github.v3+json',
    'User-Agent':    'DMS-GAS-Script'
  };
}

// ── Read dropdowns.json from GitHub ──────────────────────────
function readDropdownsJson() {
  const url  = `${GITHUB_API}/repos/${GITHUB_REPO}/contents/${GITHUB_FILE}?ref=${GITHUB_BRANCH}`;
  const resp = UrlFetchApp.fetch(url, { headers: _githubHeaders(), muteHttpExceptions: true });
  if (resp.getResponseCode() === 404) {
    // File doesn't exist yet — return empty structure
    return { data: { version: 1, updated_at: '', components: [] }, sha: null };
  }
  const json    = JSON.parse(resp.getContentText());
  const decoded = Utilities.newBlob(Utilities.base64Decode(json.content.replace(/\n/g, ''))).getDataAsString();
  return { data: JSON.parse(decoded), sha: json.sha };
}

// ── Write dropdowns.json to GitHub ───────────────────────────
function writeDropdownsJson(newData, sha, commitMessage) {
  const url     = `${GITHUB_API}/repos/${GITHUB_REPO}/contents/${GITHUB_FILE}`;
  const content = Utilities.base64Encode(JSON.stringify(newData, null, 2), Utilities.Charset.UTF_8);
  const payload = { message: commitMessage, content: content, branch: GITHUB_BRANCH };
  if (sha) payload.sha = sha; // required for update, omit for create

  const resp = UrlFetchApp.fetch(url, {
    method:          'PUT',
    headers:         _githubHeaders(),
    payload:         JSON.stringify(payload),
    contentType:     'application/json',
    muteHttpExceptions: true
  });
  const code = resp.getResponseCode();
  if (code !== 200 && code !== 201) {
    throw new Error('GitHub write failed (' + code + '): ' + resp.getContentText().substring(0, 200));
  }
  return JSON.parse(resp.getContentText());
}

// ── Add component or sub-component to JSON ───────────────────
function addComponentToGit(component, subComponent, description) {
  const { data, sha } = readDropdownsJson();

  let comp = data.components.find(c => c.component === component);
  if (!comp) {
    comp = { component: component, sub_components: [] };
    data.components.push(comp);
    // Sort components alphabetically
    data.components.sort((a, b) => a.component.localeCompare(b.component));
  }

  const exists = comp.sub_components.find(s => s.sub === subComponent);
  if (!exists) {
    comp.sub_components.push({ sub: subComponent, desc: description || '' });
  }

  data.updated_at = new Date().toISOString().split('T')[0];
  writeDropdownsJson(data, sha, 'feat: add component ' + component + ' / ' + subComponent);
}

function addSubComponentToGit(component, subComponent, description) {
  const { data, sha } = readDropdownsJson();

  let comp = data.components.find(c => c.component === component);
  if (!comp) {
    comp = { component: component, sub_components: [] };
    data.components.push(comp);
  }

  const exists = comp.sub_components.find(s => s.sub === subComponent);
  if (!exists) {
    comp.sub_components.push({ sub: subComponent, desc: description || '' });
  }

  data.updated_at = new Date().toISOString().split('T')[0];
  writeDropdownsJson(data, sha, 'feat: add sub-component ' + component + ' / ' + subComponent);
}

// ── ONE-TIME MIGRATION: Dropdowns Sheet → dropdowns.json ─────
// Run this ONCE from GAS Script Editor to migrate existing Sheet data
function migrateDropdownsSheetToGit() {
  const rows = getSheetData(CONFIG.TABS.DROPDOWNS);

  const compMap = {};
  rows.forEach(function(r) {
    const comp = (r.component || '').trim();
    const sub  = (r.sub_component || '').trim();
    const desc = (r.description || '').trim();
    if (!comp || !sub) return;
    if (!compMap[comp]) compMap[comp] = [];
    compMap[comp].push({ sub: sub, desc: desc });
  });

  const components = Object.keys(compMap).sort().map(function(c) {
    return { component: c, sub_components: compMap[c] };
  });

  const newData = {
    version:    1,
    updated_at: new Date().toISOString().split('T')[0],
    components: components
  };

  // Check if file already exists (to get sha for update)
  const { sha } = readDropdownsJson();
  writeDropdownsJson(newData, sha, 'chore: migrate Dropdowns sheet to JSON');

  Logger.log('Migration complete! Components: ' + components.length);
  return successResponse({ message: 'Migrated ' + components.length + ' components to dropdowns.json' });
}

// ── Route for migration (callable from frontend by super_admin) ─
function migrateDropdowns(token) {
  try {
    const session = requireAuth(token);
    if (session.role !== CONFIG.ROLES.SUPER_ADMIN) return errorResponse('Super admin only.');
    return migrateDropdownsSheetToGit();
  } catch(e) {
    return errorResponse(e.message);
  }
}

// ── ONE-TIME SETUP: Populate Dropdowns Sheet from dropdowns.json ─
// Run this once from GAS Editor if Dropdowns sheet is empty
function setupDropdownsSheet() {
  const STATIC = [
    { component: 'Academics', sub_component: 'Curriculum Planning',  description: '' },
    { component: 'Academics', sub_component: 'Exam & Assessment',    description: '' },
    { component: 'Academics', sub_component: 'Teacher Training',     description: '' },
    { component: 'Academics', sub_component: 'Student Enrollment',   description: '' },
    { component: 'Academics', sub_component: 'Learning Outcomes',    description: '' },
    { component: 'Academics', sub_component: 'Patrachar',            description: '' },
    { component: 'Civil',     sub_component: 'Construction',         description: '' },
    { component: 'Civil',     sub_component: 'Maintenance',          description: '' },
    { component: 'Civil',     sub_component: 'Inspection Report',    description: '' },
    { component: 'Civil',     sub_component: 'Procurement',          description: '' },
    { component: 'Govt Support', sub_component: 'Circulars & Orders', description: '' },
    { component: 'Govt Support', sub_component: 'RTI',               description: '' },
    { component: 'Govt Support', sub_component: 'Grants & Funds',    description: '' },
    { component: 'Govt Support', sub_component: 'Compliance',        description: '' },
    { component: 'IT',        sub_component: 'ICT Lab Setup',        description: '' },
    { component: 'IT',        sub_component: 'Software & Systems',   description: '' },
    { component: 'IT',        sub_component: 'Smart Class',          description: '' },
    { component: 'IT',        sub_component: 'Data Management',      description: '' },
    { component: 'IT',        sub_component: 'Technical Support',    description: '' },
    { component: 'Vocational', sub_component: 'Course Registration', description: '' },
    { component: 'Vocational', sub_component: 'Industry Linkage',    description: '' },
    { component: 'Vocational', sub_component: 'Skill Assessment',    description: '' },
    { component: 'Vocational', sub_component: 'Infrastructure',      description: '' },
  ];

  const sheet   = getSheet(CONFIG.TABS.DROPDOWNS);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const existing = getSheetData(CONFIG.TABS.DROPDOWNS);

  let added = 0;
  STATIC.forEach(function(row) {
    const exists = existing.find(function(r) {
      return r.component === row.component && r.sub_component === row.sub_component;
    });
    if (!exists) {
      const newRow = headers.map(function(h) { return row[h] !== undefined ? row[h] : ''; });
      sheet.appendRow(newRow);
      added++;
    }
  });

  invalidateCache(CONFIG.TABS.DROPDOWNS);
  Logger.log('Setup complete. Added ' + added + ' rows.');
  return { success: true, message: 'Added ' + added + ' rows to Dropdowns sheet.' };
}
