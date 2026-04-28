// Run this ONCE to create all tabs with correct headers.
// After running, delete or comment out this function.
function setupAllSheets() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);

  const schema = {
    'Users': [
      'email', 'name', 'role', 'component_access', 'folder_id', 'created_at', 'is_active'
    ],
    'Documents': [
      'doc_id', 'uploader_email', 'uploader_name', 'component', 'sub_component',
      'subject', 'description', 'file_name', 'drive_link', 'year', 'month',
      'status', 'tl_verified_by', 'tl_verified_at', 'tl_remark',
      'admin_approved_by', 'admin_approved_at', 'admin_remark', 'uploaded_at'
    ],
    'Dropdowns': [
      'component', 'sub_component', 'description', 'template_link'
    ],
    'AuditLog': [
      'timestamp', 'user_email', 'user_name', 'action', 'doc_id', 'file_name', 'ip_note'
    ],
    'OTPStore': [
      'email', 'otp', 'expires_at', 'used'
    ],
    'Circulars': [
      'circular_id', 'title', 'ref_number', 'uploaded_by', 'uploader_name',
      'drive_link', 'file_name', 'remarks', 'uploaded_at', 'total_managers'
    ],
    'CircularAck': [
      'circular_id', 'manager_email', 'manager_name', 'acknowledged_at'
    ]
  };

  for (const [tabName, headers] of Object.entries(schema)) {
    let sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      sheet = ss.insertSheet(tabName);
    } else {
      sheet.clearContents();
    }
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#1a237e')
      .setFontColor('#ffffff')
      .setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  // Seed Dropdowns tab with component data
  _seedDropdowns(ss.getSheetByName('Dropdowns'));

  // Add yourself as super_admin in Users tab
  _seedInitialUser(ss.getSheetByName('Users'));

  SpreadsheetApp.flush();
  Logger.log('✅ All sheets created successfully!');
}

function _seedDropdowns(sheet) {
  const data = [
    ['Academics', 'Curriculum Planning',  'Syllabus aur lesson plan related documents', ''],
    ['Academics', 'Exam & Assessment',     'Question papers, marksheets, result records', ''],
    ['Academics', 'Teacher Training',      'Training reports, attendance sheets', ''],
    ['Academics', 'Student Enrollment',    'New admissions, registration forms', ''],
    ['Academics', 'Learning Outcomes',     'Assessment data, progress reports', ''],
    ['Academics', 'Patrachar',             'Distance education correspondence docs', ''],
    ['IT',        'ICT Lab Setup',         'Hardware installation, lab inventory', ''],
    ['IT',        'Software & Systems',    'DIKSHA, software config, licenses', ''],
    ['IT',        'Smart Class',           'Smart board setup, usage reports', ''],
    ['IT',        'Data Management',       'MIS reports, database records', ''],
    ['IT',        'Technical Support',     'Issue logs, maintenance reports', ''],
    ['Vocational','Course Registration',   'Student enrollment in vocational courses', ''],
    ['Vocational','Industry Linkage',      'MOU, placement, industry visit reports', ''],
    ['Vocational','Skill Assessment',      'Practical exam, certification records', ''],
    ['Vocational','Infrastructure',        'Lab/workshop setup documents', ''],
    ['Civil',     'Construction',          'Building work reports, estimates', ''],
    ['Civil',     'Maintenance',           'Repair work, maintenance records', ''],
    ['Civil',     'Inspection Report',     'Site visit, quality check reports', ''],
    ['Civil',     'Procurement',           'Tender docs, purchase orders', ''],
    ['Govt Support', 'Circulars & Orders', 'Government orders, official notices', ''],
    ['Govt Support', 'RTI',               'RTI requests and responses', ''],
    ['Govt Support', 'Grants & Funds',    'Fund release, utilization certificates', ''],
    ['Govt Support', 'Compliance',        'Audit reports, compliance submissions', ''],
  ];
  sheet.getRange(2, 1, data.length, 4).setValues(data);
}

function _seedInitialUser(sheet) {
  const now = formatDate(new Date());
  sheet.appendRow([
    'alok.mohan@educategirls.ngo',
    'Alok Mohan',
    'super_admin',
    'ALL',
    '',
    now,
    true
  ]);
}
