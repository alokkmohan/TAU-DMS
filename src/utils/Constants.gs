// Replace these IDs after creating your Google Sheet and Drive folder
const CONFIG = {
  SHEET_ID: '110GnDeFCrE9PijXhrBAWYpXQ6iZNXy1ON6cNfnyh6Ik',
  ROOT_FOLDER_ID: '1VXGx0oZmCSxG7uAta2m0XXlzhLsONCzW',
  DOMAINS: ['educategirls.ngo', 'up.egtau.org'],
  OTP_EXPIRY_MINUTES: 10,
  SYSTEM_NAME: 'DMS — UP Shiksha Vibhag',

  TABS: {
    USERS:        'Users',
    DOCUMENTS:    'Documents',
    DROPDOWNS:    'Dropdowns',
    AUDIT_LOG:    'AuditLog',
    OTP_STORE:    'OTPStore',
    CIRCULARS:    'Circulars',
    CIRCULAR_ACK: 'CircularAck'
  },

  ROLES: {
    SUPER_ADMIN: 'super_admin',
    TEAM_LEAD:   'team_lead',
    MANAGER:     'manager'
  },

  STATUS: {
    PENDING:        'pending',
    TL_VERIFIED:    'tl_verified',
    TL_REJECTED:    'tl_rejected',
    ADMIN_APPROVED: 'admin_approved',
    ADMIN_REJECTED: 'admin_rejected',
    ARCHIVED:       'archived'
  }
};
