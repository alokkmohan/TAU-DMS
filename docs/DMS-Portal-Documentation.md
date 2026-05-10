# Document Management System (DMS)
### Technical Assistant Unit — UP Shiksha Vibhag | Educate Girls

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Live Links](#live-links)
3. [Tech Stack](#tech-stack)
4. [User Roles & Permissions](#user-roles--permissions)
5. [Login & Authentication](#login--authentication)
6. [Dashboard Sections](#dashboard-sections)
7. [Document Lifecycle](#document-lifecycle)
8. [Upload Flow](#upload-flow)
9. [Verify / Reject Flow](#verify--reject-flow)
10. [Circulars & Orders](#circulars--orders)
11. [Image Gallery](#image-gallery)
12. [Document Viewer](#document-viewer)
13. [Email Notifications](#email-notifications)
14. [Google Sheets Database](#google-sheets-database)
15. [Drive Folder Structure](#drive-folder-structure)
16. [File Naming Convention](#file-naming-convention)
17. [Source Code Structure](#source-code-structure)
18. [Deployment & Sync](#deployment--sync)
19. [Team Members & Access](#team-members--access)

---

## Overview

**DMS — Document Management System** is a web portal built for the UP Shiksha Vibhag team of **Educate Girls** organization. It allows field managers to upload, track, and manage official documents. Team Leads can verify or reject submissions. All data is stored in Google Sheets and files in Google Drive.

- **Organization:** Educate Girls (educategirls.ngo)
- **Developer:** Alok Mohan — alok.mohan@educategirls.ngo (IT Admin)
- **Platform:** Google Apps Script (GAS) backend + GitHub Pages frontend
- **Domain:** up.egtau.org

---

## Live Links

| Resource | URL |
|---|---|
| 🌐 **Web Portal** | https://up.egtau.org |
| ⚙️ GAS Backend | https://script.google.com/a/macros/educategirls.ngo/s/AKfycbyXUyOqDjBhAnGdNZGyuGbc6K2vfRZdAwGSQo3dWItIV4itnt7SLOj50jsRvOQlEiXNug/exec |
| 📝 Script Editor | https://script.google.com/u/1/home/projects/1qAyh5GVXyNvaLSf8U7ouWUAWUiVoWLJwMJ20fynocwn2xBj0OA9ZU2aS/edit |
| 📊 Database Sheet | https://docs.google.com/spreadsheets/d/110GnDeFCrE9PijXhrBAWYpXQ6iZNXy1ON6cNfnyh6Ik/edit |
| 📁 Drive Root Folder | https://drive.google.com/drive/folders/1VXGx0oZmCSxG7uAta2m0XXlzhLsONCzW |
| 💻 GitHub Repo | https://github.com/alokkmohan/TAU-DMS |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | HTML + CSS + Vanilla JS (single-page, served via GitHub Pages) |
| **Backend** | Google Apps Script (V8 runtime, `.gs` files) |
| **Database** | Google Sheets (DMS_Database spreadsheet, multiple tabs) |
| **File Storage** | Google Drive (structured folder hierarchy) |
| **Auth / OTP** | Gmail via GAS `MailApp` — 6-digit OTP, 10-minute expiry |
| **Session** | GAS `PropertiesService` — server-side session tokens (8-hour TTL) |
| **Dropdowns** | `dropdowns.json` stored on GitHub, served via GitHub Pages |
| **Sync Tool** | Clasp (VS Code ↔ GAS Script Editor) |
| **Version Control** | Git + GitHub (private repo) |

---

## User Roles & Permissions

### Role Hierarchy (low → high)
```
manager / communication
    ↓
team_lead
    ↓
state_lead / project_manager / ceo
    ↓
super_admin / it_admin  (same rights)
```

> **Note:** `it_admin` automatically maps to `super_admin` rights internally. This is for testing/maintenance use by the IT team.

### Permissions Matrix

| Feature | Manager | Team Lead | State Lead / PM / CEO | IT Admin / Super Admin |
|---|:---:|:---:|:---:|:---:|
| Upload document | ✅ | ✅ | ✅ | ✅ |
| Upload images | ✅ | ✅ | ✅ | ✅ |
| Upload circulars | ✅ | ✅ | ✅ | ✅ |
| View own documents (My Docs) | ✅ | ✅ | ✅ | ✅ |
| View all verified docs (All Docs) | ✅ | ✅ | ✅ | ✅ |
| Verify / Reject pending docs | ❌ | ✅ | ❌ | ✅ |
| View & download circulars | ✅ | ✅ | ✅ | ✅ |
| Acknowledge circular | ✅ | ❌ | ✅ | ❌ |
| View circular acknowledgement status | ❌ | ✅ | ✅ | ✅ |
| View document in browser (viewer) | ✅ | ✅ | ✅ | ✅ |
| Image Gallery | ✅ | ✅ | ✅ | ✅ |

> **All Documents section** shows only `tl_verified` and `admin_approved` documents. Pending documents are visible only in the Verify queue.

---

## Login & Authentication

### Flow
1. User opens **up.egtau.org**
2. Enters registered email (`@educategirls.ngo` or `@up.egtau.org` domain only)
3. Clicks **Send OTP** → 6-digit OTP sent to email via Gmail
4. OTP is valid for **10 minutes**, single-use only
5. User enters OTP → clicks **Login**
6. Backend verifies OTP → creates session token in `PropertiesService`
7. Session token stored in browser `sessionStorage`
8. Role-based dashboard loads automatically

### Session Rules
- Session TTL: **8 hours**
- Stored server-side in GAS `PropertiesService` (key: `SESSION_<uuid>`)
- Session contains: `email`, `role`, `name`, `state`, `state_group`, `component`, `createdAt`
- On logout: token deleted from PropertiesService
- Browser refresh restores session from `sessionStorage` automatically

---

## Dashboard Sections

### Sidebar Navigation (visible by role)

| Menu Item | Manager | Team Lead | IT Admin |
|---|:---:|:---:|:---:|
| 🏠 Home | ✅ | ✅ | ✅ |
| ☁️ Upload Document | ✅ | ✅ | ✅ |
| 📂 My Documents | ✅ | ✅ | ✅ |
| ✅ Verify Documents | ❌ | ✅ | ✅ |
| 📋 All Documents | ✅ | ✅ | ✅ |
| 📢 Circulars | ✅ | ✅ | ✅ |
| 🖼️ Upload Images | ✅ | ✅ | ✅ |
| 🖼️ Image Gallery | ✅ | ✅ | ✅ |

### Home Page
- Stat cards: Total Documents, Pending, Verified, Approved
- Document table: Uploaded By | Document | Date | Action
- Shows only `tl_verified` + `admin_approved` docs
- Filters: Year, Month, Component, Search

### My Documents
- All documents uploaded by the logged-in user
- Status badges: Pending / TL Verified / TL Rejected / Approved
- Actions: View (in-page) + Download
- For Team Lead / IT Admin: Verify & Reject buttons also shown on pending docs

### All Documents
- All `tl_verified` and `admin_approved` docs from all users
- Visible to every role
- Filters: Year, Month, Component, Status, Search
- Actions: View + Download

### Verify Documents *(Team Lead + IT Admin only)*
- Lists all `pending` documents from all managers
- Each row has: View, Download, Verify ✅, Reject ❌ buttons
- Reject requires a mandatory remark/reason
- After action → document status updates instantly

---

## Document Lifecycle

```
Upload
  │
  ▼
PENDING ──── TL Verifies ──▶ TL_VERIFIED ──── (no further step)
  │                               │
  └── TL Rejects ──▶ TL_REJECTED  └── (visible in All Documents)
```

**Status values:**

| Status | Meaning | Visible In |
|---|---|---|
| `pending` | Just uploaded, awaiting TL review | My Docs (uploader), Verify Queue (TL/Admin) |
| `tl_verified` | Approved by Team Lead — final approval | All Docs, My Docs |
| `tl_rejected` | Rejected by Team Lead | My Docs only |
| `admin_approved` | Further approved by Admin (optional step) | All Docs, My Docs |
| `admin_rejected` | Rejected by Admin | My Docs only |
| `archived` | Archived (retired document) | — |

> **TL Verify = Final step.** No mandatory Admin approval required in normal flow.

---

## Upload Flow

1. User clicks **Upload Document** in sidebar
2. Selects **Component** (e.g., IT, Academics, Civil)
3. **Sub-component** auto-loads from `dropdowns.json` (cascading)
4. **Description** auto-fills (editable)
5. User types **Subject** manually
6. Attaches file (PDF / DOCX / XLSX / image, etc.)
7. System auto-generates **file name** — user cannot change it
8. On submit:
   - Drive folder auto-created if not exists: `Root / UploaderName / Year / Month /`
   - File uploaded to Drive
   - Row added to `Documents` sheet
   - Entry written to `AuditLog`
   - Email notification sent to Team Lead
9. Success modal shown with options: Home / Upload Another

### File Size Limit
Google Drive via GAS supports up to **~50 MB** per file upload.

---

## Verify / Reject Flow

**Who can verify:** `team_lead` and `it_admin` only.

### Verify
1. TL opens **Verify Documents**
2. Sees list of all `pending` documents
3. Clicks **Verify ✅**
4. Status → `tl_verified`
5. Uploader gets email: *"Your document has been verified by [TL Name]"*
6. Document appears in All Documents for all users

### Reject
1. TL clicks **Reject ❌**
2. Modal opens — remark/reason is **mandatory**
3. Status → `tl_rejected`
4. Uploader gets email with TL's rejection reason
5. Document stays in uploader's My Documents only

---

## Circulars & Orders

Circulars are government/state-level orders shared with all team members.

### Upload (any role can upload)
1. Select **Upload Document** → choose component = **Govt Support** → sub-component = **Circulars & Orders**
2. Fill title, reference number (optional), remarks
3. Attach PDF
4. System notifies **all managers** via email

### Manager View
- Circulars section shows all circulars (newest first)
- Each row: Title, Date, View button, Acknowledge button
- **Mark as Read** button — one-time action, cannot be undone
- After acknowledging: shows green ✅ Acknowledged badge

### Team Lead / Admin View
- Same list but shows acknowledgement count per circular
- Format: `5/7 ack'd` (5 out of 7 managers acknowledged)

---

## Image Gallery

Separate section for uploading and viewing event/field photos.

### Upload Images
- Upload single or multiple images
- Images stored in Drive under `ImageEvents/` folder
- Entry added to `ImageEvents` sheet with: event name, description, uploaded by, date

### Image Gallery
- Grid view of all uploaded images
- Categorized by event
- Click to view full size

---

## Document Viewer

Every document in the system has a **👁 View** button that opens the document **in-page** without downloading.

### How it works
- Click **View** → full-screen overlay opens
- Google Drive preview iframe loads (supports PDF, DOCX, XLSX, images)
- Scroll through the document inside the viewer
- **Download** button available in the viewer header
- Press **×** or click outside → viewer closes

### Supported formats
PDF, Word (DOCX/DOC), Excel (XLSX/XLS), PowerPoint (PPTX), Images (JPG, PNG)

---

## Email Notifications

| Trigger | Recipient | Subject |
|---|---|---|
| Document uploaded | Team Lead | Document uploaded by [Name] |
| Document verified by TL | Uploader (Manager) | Document Verified |
| Document rejected by TL | Uploader (Manager) | Document Rejected (with remark) |
| New circular uploaded | All Managers | Naya Circular: [Title] |

All emails sent via `GmailApp.sendEmail()` from the GAS backend.

---

## Google Sheets Database

**Spreadsheet:** `DMS_Database`
**ID:** `110GnDeFCrE9PijXhrBAWYpXQ6iZNXy1ON6cNfnyh6Ik`

### Tab: Users
```
email | name | role | folder_id | created_at | is_active
```

### Tab: Documents
```
doc_id | uploader_email | uploader_name | component | sub_component |
subject | description | file_name | drive_link | year | month |
status | tl_verified_by | tl_verified_at | tl_remark |
admin_approved_by | admin_approved_at | admin_remark | uploaded_at
```

### Tab: Dropdowns
```
component | sub_component | description | template_link
```
*Master list for all upload form dropdowns. Also stored in `dropdowns.json` on GitHub for fast frontend loading.*

### Tab: AuditLog
```
timestamp | user_email | user_name | action | doc_id | file_name | ip_note
```

### Tab: Circulars
```
circular_id | title | ref_number | uploaded_by | drive_link |
file_name | remarks | uploaded_at | total_managers
```

### Tab: CircularAck
```
circular_id | manager_email | manager_name | acknowledged_at
```

### Tab: OTPStore *(auto-cleared after use)*
```
email | otp | expires_at | used
```

### Tab: ImageEvents
```
event_id | event_name | description | drive_link | file_name | uploaded_by | uploaded_at
```

---

## Drive Folder Structure

```
DMS_Documents/  (Root Folder)
├── Alok_Mohan/
│   └── 2026/
│       ├── April/
│       └── May/
├── Shreya_Singh/
│   └── 2026/
│       └── May/
├── [Manager_Name]/
│   └── [Year]/
│       └── [Month]/
└── ImageEvents/
    └── [Event images...]
```

> Folders are **auto-created** on first upload. Never created manually.

---

## File Naming Convention

Auto-generated by system at upload time. User cannot change it.

```
[Component]_[SubComponent]_[Month]_[Year]_[UploaderFirstName].[ext]
```

**Example:**
```
IT_SmartClass_May_2026_Alok.pdf
Academics_ExamAssessment_April_2026_Shreya.docx
Civil_Construction_May_2026_Rahul.xlsx
```

---

## Source Code Structure

```
TAU-DMS/
├── index.html                   ← GitHub Pages frontend (auto-synced from src/ui/Index.html)
├── dropdowns.json               ← Component/Sub-component data (served via GitHub Pages)
├── CLAUDE.md                    ← Developer context file for AI assistant
├── appsscript.json              ← GAS manifest
├── .clasp.json                  ← GAS Script ID (gitignored)
│
├── src/
│   ├── Code.gs                  ← Main doGet() router — serves frontend HTML
│   │
│   ├── auth/
│   │   ├── Login.gs             ← OTP generation, email send, OTP verify
│   │   └── Session.gs           ← Session create / validate / destroy / requireRole
│   │
│   ├── modules/
│   │   ├── Upload.gs            ← Document upload, Drive folder create, isVisible()
│   │   ├── Verify.gs            ← TL verify, TL reject, Admin approve, Admin reject
│   │   ├── Circular.gs          ← Circular upload, fetch, acknowledge
│   │   └── ImageUpload.gs       ← Image upload to Drive, gallery fetch
│   │
│   ├── utils/
│   │   ├── Constants.gs         ← CONFIG object (Sheet ID, Folder ID, roles, statuses)
│   │   ├── Helpers.gs           ← successResponse(), errorResponse(), formatDate(), etc.
│   │   ├── SheetManager.gs      ← getSheetData(), updateCell(), appendRow(), etc.
│   │   ├── DriveManager.gs      ← createFolder(), uploadFile(), getFileUrl(), etc.
│   │   ├── GitHubManager.gs     ← Read/write dropdowns.json via GitHub API
│   │   ├── SetupSheets.gs       ← One-time sheet header setup utility
│   │   └── Debug.gs             ← Test/debug helper functions
│   │
│   └── ui/
│       └── Index.html           ← Full single-page frontend (HTML + CSS + JS)
│
└── docs/
    └── DMS-Portal-Documentation.md   ← This file
```

---

## Deployment & Sync

### Frontend (GitHub Pages → up.egtau.org)
```bash
# After editing src/ui/Index.html:
cp src/ui/Index.html index.html
git add src/ui/Index.html index.html
git commit -m "your message"
git push origin main
```
GitHub Pages automatically serves `index.html` at `up.egtau.org`.

### Backend (GAS via Clasp)
```bash
# Push GAS files to Script Editor:
clasp push --force

# Deploy new version (same deployment ID):
clasp deploy -i <DEPLOYMENT_ID>
```

### Dropdowns (GitHub API)
`dropdowns.json` is stored in the GitHub repo root and served via GitHub Pages.
- Read at: `https://up.egtau.org/dropdowns.json`
- Updated via GAS `GitHubManager.gs` using GitHub PAT stored in Script Properties

---

## Team Members & Access

| Name | Email | Role | Access Level |
|---|---|---|---|
| Alok Mohan | alok.mohan@educategirls.ngo | `it_admin` | Full (same as super_admin) |
| Aditya Pratap Singh | adityapratap.singh1@educategirls.ngo | `team_lead` | Verify/Reject + All Docs |
| Nitin Kumar Jha | nitinkumar.jha@educategirls.ngo | `state_lead` | All Docs (view only) |
| Shreya Singh | shreya.singh@educategirls.ngo | `manager` | Own Docs + Upload |
| Academic Managers | — | `manager` | Own Docs + Upload |
| Vocational Manager | — | `manager` | Own Docs + Upload |
| Civil Engineer | — | `manager` | Own Docs + Upload |

---

## Key Technical Notes

1. **No hardcoded IDs** — Sheet ID and Folder ID always come from `CONFIG` in `Constants.gs`
2. **All Drive ops** go through `DriveManager.gs`
3. **All Sheet ops** go through `SheetManager.gs`
4. **Session check** at top of every backend function via `requireAuth(token)`
5. **Role check** via `requireRole(session, [allowedRoles])` — `it_admin` auto-maps to `super_admin`
6. **AuditLog** entry written for every upload, verify, reject, approve, download
7. **OTP** — 6-digit numeric, single-use, 10-minute expiry, cleared after use
8. **File naming** — auto-generated server-side, user input never used for filename
9. **Domain check** — only `@educategirls.ngo` and `@up.egtau.org` emails accepted
10. **Client-side filtering** — all search/filter on document lists runs in browser JS, not new API calls

---

*Last updated: May 2026*
*Developer: Alok Mohan — Technical Assistant Unit, Educate Girls*
