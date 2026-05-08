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
