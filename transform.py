import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('src/ui/Index.html', 'r', encoding='utf-8') as f:
    html = f.read()

script_start = html.rfind('<script>')
script_end   = html.rfind('</script>') + len('</script>')
pre  = html[:script_start]
post = html[script_end:]

NEW_SCRIPT = """<script>
// ════════════════════════════════════════════════
//  CONFIG — update GAS_URL after each new deployment
// ════════════════════════════════════════════════
var GAS_URL = 'PASTE_NEW_DEPLOYMENT_URL_HERE';

// ════════════════════════════════════════════════
//  API HELPER  (replaces google.script.run)
// ════════════════════════════════════════════════
function api(action) {
  var args = Array.prototype.slice.call(arguments, 1);
  return fetch(GAS_URL, {
    method:   'POST',
    headers:  { 'Content-Type': 'text/plain' },
    body:     JSON.stringify({ action: action, params: args }),
    redirect: 'follow'
  }).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}

// ════════════════════════════════════════════════
//  SESSION
// ════════════════════════════════════════════════
var SESSION = { token: null, role: null, name: null };

function initApp() {
  var token = sessionStorage.getItem('dms_token');
  var role  = sessionStorage.getItem('dms_role');
  var name  = sessionStorage.getItem('dms_name');
  if (token && role && name) {
    SESSION = { token: token, role: role, name: name };
    showDashboard();
  } else {
    showLoginPage();
  }
}

function showLoginPage() {
  document.getElementById('loginPage').style.display    = 'flex';
  document.getElementById('dashboardPage').style.display = 'none';
}

function showDashboard() {
  document.getElementById('loginPage').style.display    = 'none';
  document.getElementById('dashboardPage').style.display = 'block';
  document.getElementById('userNameDisplay').textContent = SESSION.name;
  document.getElementById('roleDisplay').textContent =
    SESSION.role === 'super_admin' ? 'Super Admin' :
    SESSION.role === 'team_lead'   ? 'Team Lead'   : 'Manager';
  buildSidebar();
  loadComponents();
  populateYearFilters();
  showSection('upload');
}

// ════════════════════════════════════════════════
//  LOGIN
// ════════════════════════════════════════════════
var currentEmail = '';

function showLoginMsg(text, type) {
  var el = document.getElementById('loginMsg');
  el.textContent = text; el.className = type; el.style.display = 'block';
}

function setLoginLoading(btnId, loading, label) {
  var btn = document.getElementById(btnId);
  btn.disabled = loading;
  btn.innerHTML = loading ? '<span class=\\"spinner\\"></span>Please wait...' : label;
}

function sendOTP() {
  var email = document.getElementById('emailInput').value.trim().toLowerCase();
  if (!email) { showLoginMsg('Please enter your email address.', 'error'); return; }
  var validDomains = ['educategirls.ngo', 'up.egtau.org'];
  if (!validDomains.some(function(d) { return email.endsWith('@' + d); })) {
    showLoginMsg('Only @educategirls.ngo or @up.egtau.org email addresses are allowed.', 'error'); return;
  }
  setLoginLoading('sendOtpBtn', true, 'Send OTP');
  document.getElementById('loginMsg').style.display = 'none';

  api('sendOTP', email)
    .then(function(res) {
      setLoginLoading('sendOtpBtn', false, 'Send OTP');
      if (!res.success) { showLoginMsg(res.message, 'error'); return; }
      currentEmail = email;
      document.getElementById('otpSection').style.display = 'block';
      document.getElementById('otpInfo').textContent = 'OTP sent to: ' + email + ' (valid for 10 minutes)';
      document.getElementById('otpInput').focus();
      showLoginMsg('OTP has been sent to your email.', 'success');
    })
    .catch(function() {
      setLoginLoading('sendOtpBtn', false, 'Send OTP');
      showLoginMsg('Server error. Please try again.', 'error');
    });
}

function verifyOTP() {
  var otp = document.getElementById('otpInput').value.trim();
  if (!otp || otp.length !== 6) { showLoginMsg('Please enter the 6-digit OTP.', 'error'); return; }
  setLoginLoading('verifyOtpBtn', true, 'Login');

  api('verifyOTP', currentEmail, otp)
    .then(function(res) {
      setLoginLoading('verifyOtpBtn', false, 'Login');
      if (!res.success) { showLoginMsg(res.message, 'error'); return; }
      sessionStorage.setItem('dms_token', res.data.token);
      sessionStorage.setItem('dms_role',  res.data.role);
      sessionStorage.setItem('dms_name',  res.data.name);
      SESSION = { token: res.data.token, role: res.data.role, name: res.data.name };
      showDashboard();
    })
    .catch(function() {
      setLoginLoading('verifyOtpBtn', false, 'Login');
      showLoginMsg('Server error. Please try again.', 'error');
    });
}

function resendOTP() {
  document.getElementById('otpInput').value = '';
  document.getElementById('loginMsg').style.display = 'none';
  sendOTP();
}

document.addEventListener('keydown', function(e) {
  if (e.key !== 'Enter') return;
  if (document.getElementById('otpSection').style.display === 'block') verifyOTP();
  else sendOTP();
});

// ════════════════════════════════════════════════
//  SIDEBAR
// ════════════════════════════════════════════════
function buildSidebar() {
  var items = [
    { id: 'upload',   icon: '\\u{1F4E4}', label: 'Upload Document' },
    { id: 'mydocs',   icon: '\\u{1F4C1}', label: 'My Documents' }
  ];
  if (SESSION.role === 'team_lead' || SESSION.role === 'super_admin') {
    items.push({ id: 'alldocs', icon: '\\u{1F4CB}', label: 'All Documents' });
  }
  items.push({ id: 'circulars', icon: '\\u{1F4E2}', label: 'Circulars' });

  document.getElementById('sidebar').innerHTML = items.map(function(item) {
    return '<div class=\\"nav-item\\" id=\\"nav-' + item.id + '\\" onclick=\\"showSection(' + "'" + item.id + "'" + ')\\">' +
           '<span>' + item.icon + '</span> ' + item.label + '</div>';
  }).join('');
}

function showSection(id) {
  document.querySelectorAll('.section').forEach(function(s) { s.classList.remove('active'); });
  document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
  var sec = document.getElementById('sec-' + id);
  var nav = document.getElementById('nav-' + id);
  if (sec) sec.classList.add('active');
  if (nav) nav.classList.add('active');
  if (id === 'mydocs')    loadDocs();
  if (id === 'alldocs')   loadAllDocs();
  if (id === 'circulars') loadCirculars();
}

// ════════════════════════════════════════════════
//  UPLOAD
// ════════════════════════════════════════════════
var selectedFile = null;

function loadComponents() {
  var shareGroup = document.getElementById('shareWithGroup');
  if (shareGroup) {
    shareGroup.style.display =
      (SESSION.role === 'team_lead' || SESSION.role === 'super_admin') ? 'block' : 'none';
  }
  api('getComponents', SESSION.token)
    .then(function(res) {
      if (!res.success) return;
      ['componentSelect', 'filterComponent', 'allFilterComponent'].forEach(function(id) {
        var sel = document.getElementById(id);
        if (!sel) return;
        res.data.forEach(function(c) {
          var o = document.createElement('option');
          o.value = o.textContent = c;
          sel.appendChild(o);
        });
      });
      var tsel = document.getElementById('targetComponentSelect');
      if (tsel) {
        res.data.forEach(function(c) {
          var o = document.createElement('option');
          o.value = c; o.textContent = c;
          tsel.appendChild(o);
        });
      }
    });
}

function loadSubComponents() {
  var comp = document.getElementById('componentSelect').value;
  var sub  = document.getElementById('subComponentSelect');
  sub.innerHTML = '<option value="">-- Select sub-component --</option>';
  sub.disabled  = !comp;
  document.getElementById('descriptionInput').value = '';
  if (!comp) return;
  api('getSubComponents', SESSION.token, comp)
    .then(function(res) {
      if (!res.success) return;
      res.data.forEach(function(item) {
        var o = document.createElement('option');
        o.value = item.sub; o.textContent = item.sub; o.dataset.desc = item.desc;
        sub.appendChild(o);
      });
      sub.disabled = false;
    });
}

function fillDescription() {
  var sub = document.getElementById('subComponentSelect');
  var opt = sub.options[sub.selectedIndex];
  if (opt && opt.dataset.desc) document.getElementById('descriptionInput').value = opt.dataset.desc;
}

function handleFileSelect(input) { if (input.files[0]) setFile(input.files[0]); }
function handleDrop(e) {
  e.preventDefault();
  document.getElementById('fileDrop').classList.remove('drag-over');
  if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
}
function setFile(file) {
  if (file.size > 10 * 1024 * 1024) {
    showUploadAlert('File size exceeds 10MB. Please upload a smaller file.', 'error'); return;
  }
  selectedFile = file;
  var sizeMB = (file.size / (1024 * 1024)).toFixed(2);
  document.getElementById('fileNameDisplay').textContent = file.name + ' (' + sizeMB + ' MB)';
}

function submitUpload() {
  var component    = document.getElementById('componentSelect').value;
  var subComponent = document.getElementById('subComponentSelect').value;
  var subject      = document.getElementById('subjectInput').value.trim();
  var description  = document.getElementById('descriptionInput').value.trim();
  if (!component || !subComponent || !subject || !selectedFile) {
    showUploadAlert('Please fill all required fields and attach a file.', 'error'); return;
  }
  var btn = document.getElementById('uploadBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class=\\"spinner\\"></span>Uploading...';

  var reader = new FileReader();
  reader.onload = function(ev) {
    var base64 = ev.target.result.split(',')[1];
    var targetComponent = document.getElementById('targetComponentSelect')
      ? document.getElementById('targetComponentSelect').value : '';
    api('uploadDocument', SESSION.token, {
      component: component, subComponent: subComponent,
      subject: subject, description: description,
      fileBase64: base64, fileName: selectedFile.name, mimeType: selectedFile.type,
      targetComponent: targetComponent
    })
    .then(function(res) {
      btn.disabled = false; btn.innerHTML = 'Upload Document';
      if (!res.success) { showUploadAlert(res.message, 'error'); return; }
      showUploadAlert(res.data.message + ' | File: ' + res.data.fileName, 'success');
      resetUploadForm();
    })
    .catch(function() {
      btn.disabled = false; btn.innerHTML = 'Upload Document';
      showUploadAlert('Server error. Please try again.', 'error');
    });
  };
  reader.readAsDataURL(selectedFile);
}

function showUploadAlert(msg, type) {
  var el = document.getElementById('uploadAlert');
  el.textContent = msg; el.className = 'alert alert-' + type; el.style.display = 'block';
  setTimeout(function() { el.style.display = 'none'; }, 7000);
}

function resetUploadForm() {
  document.getElementById('componentSelect').value = '';
  document.getElementById('subComponentSelect').innerHTML = '<option value="">-- Select sub-component --</option>';
  document.getElementById('subComponentSelect').disabled = true;
  document.getElementById('subjectInput').value = '';
  document.getElementById('descriptionInput').value = '';
  document.getElementById('fileNameDisplay').textContent = '';
  document.getElementById('fileInput').value = '';
  selectedFile = null;
}

// ════════════════════════════════════════════════
//  DOCUMENTS
// ════════════════════════════════════════════════
function loadDocs() {
  document.getElementById('docsTableBody').innerHTML = '<tr><td colspan=\\"8\\" class=\\"no-data\\">Loading...</td></tr>';
  api('getDocuments', SESSION.token, getFilters('filter'))
    .then(function(res) { if (!res.success) return; renderDocsTable('docsTableBody', res.data, false); });
}

function loadAllDocs() {
  document.getElementById('allDocsTableBody').innerHTML = '<tr><td colspan=\\"8\\" class=\\"no-data\\">Loading...</td></tr>';
  api('getDocuments', SESSION.token, getFilters('allFilter'))
    .then(function(res) { if (!res.success) return; renderDocsTable('allDocsTableBody', res.data, true); });
}

function getFilters(prefix) {
  return {
    year:      document.getElementById(prefix + 'Year').value,
    month:     document.getElementById(prefix + 'Month').value,
    component: document.getElementById(prefix + 'Component').value,
    status:    document.getElementById(prefix + 'Status').value,
    search:    document.getElementById(prefix + 'Search').value
  };
}

function renderDocsTable(tbodyId, rows, showUploader) {
  var tbody = document.getElementById(tbodyId);
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan=\\"8\\" class=\\"no-data\\">No documents found.</td></tr>'; return;
  }
  tbody.innerHTML = rows.map(function(r, i) {
    var canVerify = (SESSION.role === 'team_lead' || SESSION.role === 'super_admin') && r.status === 'pending';
    var verifyBtns = canVerify
      ? '<button class=\\"btn btn-success btn-sm\\" onclick=\\"verifyDoc(\\'' + r.doc_id + '\\')\\">Verify</button> ' +
        '<button class=\\"btn btn-danger btn-sm\\" onclick=\\"openRejectModal(\\'' + r.doc_id + '\\')\\">Reject</button>'
      : '';
    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      (showUploader ? '<td>' + r.uploader_name + '</td>' : '') +
      '<td>' + r.subject + '</td>' +
      '<td>' + r.component + '</td>' +
      '<td>' + r.sub_component + '</td>' +
      (showUploader ? '<td>' + r.month + ' ' + r.year + '</td>' : '<td>' + r.month + '</td><td>' + r.year + '</td>') +
      '<td>' + statusBadge(r.status) + '</td>' +
      '<td><a href=\\"' + toDownloadUrl(r.drive_link) + '\\" target=\\"_blank\\" class=\\"btn btn-outline btn-sm\\">Download</a> ' + verifyBtns + '</td>' +
      '</tr>';
  }).join('');
}

function toDownloadUrl(url) {
  if (!url) return '#';
  if (url.includes('export=download')) return url;
  var match = url.match(/\\/d\\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
  if (match) return 'https://drive.google.com/uc?export=download&id=' + match[1];
  return url;
}

function statusBadge(s) {
  var map = { pending:'badge-pending,Pending', tl_verified:'badge-verified,TL Verified',
    tl_rejected:'badge-rejected,TL Rejected', admin_approved:'badge-approved,Approved',
    admin_rejected:'badge-rejected,Rejected', archived:'badge-archived,Archived' };
  var parts = (map[s] || 'badge-pending,' + s).split(',');
  return '<span class=\\"badge ' + parts[0] + '\\">' + parts[1] + '</span>';
}

function clearFilters() {
  ['filterYear','filterMonth','filterComponent','filterStatus'].forEach(function(id){ document.getElementById(id).value=''; });
  document.getElementById('filterSearch').value=''; loadDocs();
}
function clearAllFilters() {
  ['allFilterYear','allFilterMonth','allFilterComponent','allFilterStatus'].forEach(function(id){ document.getElementById(id).value=''; });
  document.getElementById('allFilterSearch').value=''; loadAllDocs();
}

// ════════════════════════════════════════════════
//  VERIFY / REJECT
// ════════════════════════════════════════════════
var rejectDocId = null;

function verifyDoc(docId) {
  if (!confirm('Verify this document?')) return;
  api('verifyDocument', SESSION.token, docId)
    .then(function(res) { alert(res.success ? 'Document verified!' : res.message); loadAllDocs(); });
}

function openRejectModal(docId) {
  rejectDocId = docId;
  document.getElementById('rejectRemark').value = '';
  document.getElementById('rejectModal').classList.add('open');
}
function closeRejectModal() { document.getElementById('rejectModal').classList.remove('open'); rejectDocId = null; }
function confirmReject() {
  var remark = document.getElementById('rejectRemark').value.trim();
  if (!remark) { alert('Please enter a rejection reason.'); return; }
  api('rejectDocument', SESSION.token, rejectDocId, remark)
    .then(function(res) { closeRejectModal(); alert(res.success ? 'Document rejected.' : res.message); loadAllDocs(); });
}

// ════════════════════════════════════════════════
//  CIRCULARS
// ════════════════════════════════════════════════
function loadCirculars() {
  document.getElementById('circularsTableBody').innerHTML = '<tr><td colspan=\\"6\\" class=\\"no-data\\">Loading...</td></tr>';
  api('getCirculars', SESSION.token)
    .then(function(res) { if (!res.success) return; renderCirculars(res.data); });
}

function renderCirculars(rows) {
  var tbody = document.getElementById('circularsTableBody');
  if (!rows.length) { tbody.innerHTML = '<tr><td colspan=\\"6\\" class=\\"no-data\\">No circulars found.</td></tr>'; return; }
  tbody.innerHTML = rows.map(function(r, i) {
    var ackBtn = '';
    if (SESSION.role === 'manager') {
      ackBtn = r.acknowledged
        ? '<span style=\\"color:#2e7d32;font-weight:600\\">Acknowledged</span>'
        : '<button class=\\"btn btn-success btn-sm\\" onclick=\\"acknowledgeCircular(\\'' + r.circular_id + '\\', this)\\">Mark as Read</button>';
    } else {
      ackBtn = '<span style=\\"font-size:0.8rem;color:#757575\\">' + r.ack_count + '/' + r.total_managers + ' acknowledged</span>';
    }
    return '<tr>' +
      '<td>' + (i+1) + '</td><td>' + r.title + '</td><td>' + (r.ref_number||'—') + '</td>' +
      '<td>' + r.uploaded_at + '</td>' +
      '<td>' + (r.acknowledged ? '<span class=\\"badge badge-verified\\">Acknowledged</span>' : '<span class=\\"badge badge-pending\\">Pending</span>') + '</td>' +
      '<td><a href=\\"' + toDownloadUrl(r.drive_link) + '\\" target=\\"_blank\\" class=\\"btn btn-outline btn-sm\\">Download</a> ' + ackBtn + '</td></tr>';
  }).join('');
}

function acknowledgeCircular(circularId, btn) {
  btn.disabled = true; btn.textContent = '...';
  api('acknowledgeCircular', SESSION.token, circularId)
    .then(function(res) {
      if (res.success) btn.outerHTML = '<span style=\\"color:#2e7d32;font-weight:600\\">Acknowledged</span>';
      else { btn.disabled = false; btn.textContent = 'Mark as Read'; alert(res.message); }
    });
}

// ════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════
function populateYearFilters() {
  var y = new Date().getFullYear();
  ['filterYear','allFilterYear'].forEach(function(id) {
    var sel = document.getElementById(id); if (!sel) return;
    [y, y-1, y-2].forEach(function(yr) {
      var o = document.createElement('option'); o.value = o.textContent = yr; sel.appendChild(o);
    });
  });
}

function logout() {
  if (!confirm('Are you sure you want to logout?')) return;
  api('logoutUser', SESSION.token).then(function() {
    sessionStorage.clear();
    SESSION = { token: null, role: null, name: null };
    document.getElementById('emailInput').value = '';
    document.getElementById('otpInput').value = '';
    document.getElementById('otpSection').style.display = 'none';
    document.getElementById('loginMsg').style.display = 'none';
    showLoginPage();
  });
}

// ════════════════════════════════════════════════
//  START
// ════════════════════════════════════════════════
initApp();
</script>"""

new_html = pre + NEW_SCRIPT + post

with open('src/ui/Index.html', 'w', encoding='utf-8') as f:
    f.write(new_html)
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(new_html)

print('Done. Size:', round(len(new_html)/1024/1024, 2), 'MB')
