const CONFIG = {
  SHEET_ID:       '110GnDeFCrE9PijXhrBAWYpXQ6iZNXy1ON6cNfnyh6Ik',
  ROOT_FOLDER_ID: '1VXGx0oZmCSxG7uAta2m0XXlzhLsONCzW',
  DOMAINS:        ['educategirls.ngo', 'up.egtau.org'],
  OTP_EXPIRY_MINUTES: 10,
  SYSTEM_NAME:    'Document Management System',

  // ── State Groups ──────────────────────────────
  STATE_GROUPS: {
    '6A': ['UP', 'MP', 'Bihar', 'Jharkhand', 'Rajasthan', 'Chhattisgarh'],
    '6B': ['Maharashtra', 'Telangana', 'West Bengal', 'Odisha', 'Andhra Pradesh', 'Assam']
  },

  // ── Sheet Tabs ────────────────────────────────
  TABS: {
    USERS:        'Users',
    DOCUMENTS:    'Documents',
    DROPDOWNS:    'Dropdowns',
    AUDIT_LOG:    'AuditLog',
    OTP_STORE:    'OTPStore',
    CIRCULARS:    'Circulars',
    CIRCULAR_ACK: 'CircularAck'
  },

  // ── Role Hierarchy (bottom → top) ─────────────
  ROLES: {
    MANAGER:         'manager',
    TEAM_LEAD:       'team_lead',
    STATE_LEAD:      'state_lead',
    PROJECT_MANAGER: 'project_manager',
    CEO:             'ceo',
    SUPER_ADMIN:     'super_admin'
  },

  // ── Document Status Flow ──────────────────────
  STATUS: {
    PENDING:        'pending',
    TL_VERIFIED:    'tl_verified',
    TL_REJECTED:    'tl_rejected',
    ADMIN_APPROVED: 'admin_approved',
    ADMIN_REJECTED: 'admin_rejected',
    ARCHIVED:       'archived'
  },

  // ── Documents LOCKED after these statuses ─────
  // (cannot be deleted once TL has acted on them)
  LOCKED_STATUSES: ['tl_verified', 'tl_rejected', 'admin_approved', 'admin_rejected', 'archived']
};
