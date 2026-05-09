# DMS — TAU Project State
> Last updated: 2026-05-09  
> Developer: Alok Mohan (alok.mohan@educategirls.ngo)

---

## Live URLs
| What | URL |
|------|-----|
| **Web App (GAS)** | https://script.google.com/a/macros/educategirls.ngo/s/AKfycbyXUyOqDjBhAnGdNZGyuGbc6K2vfRZdAwGSQo3dWItIV4itnt7SLOj50jsRvOQlEiXNug/exec |
| **GitHub Pages (frontend)** | https://alokkmohan.github.io/TAU-DMS/ (index.html) |
| **Script Editor** | https://script.google.com/u/1/home/projects/1qAyh5GVXyNvaLSf8U7ouWUAWUiVoWLJwMJ20fynocwn2xBj0OA9ZU2aS/edit |
| **Sheet (DB)** | https://docs.google.com/spreadsheets/d/110GnDeFCrE9PijXhrBAWYpXQ6iZNXy1ON6cNfnyh6Ik/edit |
| **Drive Root** | https://drive.google.com/drive/folders/1VXGx0oZmCSxG7uAta2m0XXlzhLsONCzW |

---

## Architecture

```
Browser (index.html on GitHub Pages)
    │
    ├── dropdowns.json  ← fetched from GitHub Pages (fast, no GAS)
    │   cached in localStorage (key: dms_dd_v2, TTL: 1 hour)
    │
    └── GAS Web App (doPost JSON API)
            │
            ├── Google Sheets (DMS_Database)
            └── Google Drive (file storage)
```

**Two frontend files — keep in sync always:**
- `index.html` — GitHub Pages version (primary)
- `src/ui/Index.html` — GAS-served version (clasp push)

---

## GAS Deployment

```bash
# After any src/ change:
clasp push

# index.html changes only need git push (GitHub Pages auto-deploys)
git push origin main
```

**GAS_URL** (in index.html line ~707):
```
https://script.google.com/macros/s/AKfycbzp5cWmaA2r7JhlaGKKwVhl-m5noeUlHxo9Wr2jL7eBqpFoze7Mlm6bVdUll9ahzI71Ag/exec
```
> Update this URL whenever a **new versioned deployment** is made in GAS editor.

---

## Roles & Sidebar Menu

| Role | Sidebar items |
|------|--------------|
| `manager` | Home, Upload Document, My Documents, Circulars |
| `team_lead` | Home, Upload Document, My Documents, Verify Documents, Circulars |
| `super_admin` | Home, Upload Document, My Documents, Verify Documents, Circulars |

**Removed from sidebar** (intentionally):
- ~~All Documents~~ — Home page already shows all docs with filters
- ~~Admin Panel~~ — No features built yet; add back when ready

---

## Home Page

- Shows **all documents** (for TL/Admin) or own docs (for manager)
- Table columns: `# | Uploaded By | Document | Date | Action`
- **Status column NOT shown** on home (only shown in My Documents)
- Sort: **latest first** (by `uploaded_at` descending)
- Pagination: 20 rows, "Load More" button appends next 20
- Filters: Year, Month, Component, free-text search
- Stat cards: Total Components, Total Documents, My Documents, Pending Approval (TL/Admin only)

---

## Document Table Style (home + My Documents)

Every document row shows:
```
[ IT ]  [ Smart Class ]          ← blue badge + green badge
Annual ICT Report 2025           ← subject (bold)
Optional description here        ← description (small gray)
```
Action cell:
```
[ DOCX ]                         ← file-type colour badge
[ ⬇ Download ]                   ← primary blue button
[ ✓ Verify ] [ ✗ Reject ]        ← only for TL/Admin on pending docs
```

File type badge colours:
- 🔴 PDF · 🔵 DOC/DOCX · 🟢 XLS/XLSX · 🟦 CSV · 🟠 PPT/PPTX

---

## Upload Form

- **Accepted types**: PDF, DOC, DOCX, XLS, XLSX, CSV, PPT, PPTX
- **Images (JPG/PNG) removed** — separate image plan pending
- **Max file size**: 35 MB (GAS POST body hard limit ~50 MB; base64 overhead = ~35 MB safe max)
- After successful upload: **modal popup** appears (not top banner) with:
  - ✅ "Document Uploaded Successfully!"
  - File name shown
  - Buttons: **Home Dashboard** | **Upload Another**
- Dropdowns: Component → Sub-component cascade
  - Add new Component or Sub-component inline (saved to `dropdowns.json` via GAS → GitHub API)

---

## Dropdown Data Flow

```
dropdowns.json (GitHub Pages)
    ↓  fetched on login (fetchDropdownsFromGit)
    ↓  cached in localStorage (dms_dd_v2, 1h TTL)
    ↓  stored in SUBCACHE (memory, component → [{sub, desc}])

If dropdowns.json fetch fails → fallback to GAS getDashboardInit
```

**dropdowns.json** (5 components, 23 sub-components):
- Academics: Curriculum Planning, Exam & Assessment, Teacher Training, Student Enrollment, Learning Outcomes, Patrachar
- Civil: Construction, Maintenance, Inspection Report, Procurement
- Govt Support: Circulars & Orders, RTI, Grants & Funds, Compliance
- IT: ICT Lab Setup, Software & Systems, Smart Class, Data Management, Technical Support
- Vocational: Course Registration, Industry Linkage, Skill Assessment, Infrastructure

---

## Login Page (src/ui/Login.html)

- OTP-based login (no password)
- Domain restricted: `@educategirls.ngo` only
- OTP: 6-digit, single-use, 10-minute expiry
- All text in **English only** (no Hindi anywhere)
- After verify → session stored in `sessionStorage` (dms_token, dms_role, dms_name)

---

## Header (Topbar)

```
[ EG Logo white-bg pill ] | Document Management System
                            Technical Assistant Unit | Educate Girls
                                                         Alok Mohan [SUPER ADMIN] [Logout]
```

Logo: `https://www.educategirls.ngo/wp-content/themes/egindia/static/images/eg-logo.png`  
Logo CSS: `background:#fff; padding:3px 8px; border-radius:8px` (white pill so logo visible on dark topbar)

---

## Caching Strategy

| Layer | Key | TTL | What |
|-------|-----|-----|------|
| GAS CacheService | internal | 10 min | Sheet reads (getSheetData) |
| Frontend memory | `CACHE.docs` | 90 sec | Document list |
| Frontend memory | `SUBCACHE` | session | Component→sub map |
| localStorage | `dms_dd_v2` | 1 hour | Dropdown components |

**To clear dropdown cache** (e.g. after adding new component):
- Automatic: `clearLocalDropdowns()` called after `saveCustomComponent/SubComponent`
- Manual: user can clear browser localStorage

---

## Blank Screen Fix (post-login)

`showDashboard()` now calls `showSection('home')` **immediately** after `buildSidebar()`.  
Dropdowns load in background — home is visible instantly, no 5-second wait.

---

## Language Policy

**All text in English only** — no Hindi/Hinglish anywhere in:
- UI labels, buttons, placeholders
- Alert/error messages
- Email notifications
- Backend error responses

Files cleaned: `index.html`, `src/ui/Index.html`, `src/ui/Login.html`, `src/ui/Dashboard.html`, `src/modules/Circular.gs`

---

## File Structure (what matters)

```
TAU-DMS/
├── index.html               ← GitHub Pages frontend (PRIMARY)
├── dropdowns.json           ← Component/sub-component data (served by Pages)
├── PROJECT_STATE.md         ← This file
├── CLAUDE.md                ← Original project spec
│
└── src/
    ├── Code.gs              ← Router (doGet / doPost / _route)
    ├── appsscript.json      ← GAS manifest
    │
    ├── auth/
    │   ├── Login.gs         ← OTP send/verify
    │   └── Session.gs       ← Token create/validate/destroy
    │
    ├── modules/
    │   ├── Upload.gs        ← uploadDocument, addComponent, addSubComponent, getDashboardInit
    │   ├── Verify.gs        ← verifyDocument, rejectDocument, approveDocument
    │   ├── Circular.gs      ← uploadCircular, getCirculars, acknowledgeCircular
    │   └── Dropdown.gs      ← getComponents, getSubComponents
    │
    ├── ui/
    │   ├── Index.html       ← GAS-served version of index.html (keep in sync!)
    │   ├── Login.html       ← GAS-served login page
    │   └── Dashboard.html   ← Legacy dashboard (mostly replaced by Index.html)
    │
    └── utils/
        ├── Constants.gs     ← CONFIG object (Sheet ID, Folder ID, roles, tabs)
        ├── SheetManager.gs  ← All Sheets read/write
        ├── DriveManager.gs  ← All Drive operations
        ├── GitHubManager.gs ← Read/write dropdowns.json via GitHub API
        ├── Helpers.gs       ← successResponse, errorResponse, etc.
        └── SetupSheets.gs   ← One-time setup utilities
```

---

## Known Pending Items

| Item | Status |
|------|--------|
| Image upload (separate plan) | ❌ Not built — JPG/PNG removed from upload form |
| Admin Panel features (user management, audit log, reports) | ❌ Menu item removed until ready |
| GitHub PAT for addComponent→Git write | ⚠️ Optional — GAS tries, silently skips if PAT not set |
| Page count in document rows | ❌ Needs Drive API per-file call — skipped |
| 1 GB file upload | ❌ Not possible via GAS (35 MB hard limit). Needs direct Drive API upload from browser |

---

## Common Mistakes to Avoid

1. **Never edit only one HTML file** — always apply changes to BOTH `index.html` AND `src/ui/Index.html`
2. **After any `src/` change** → must `clasp push` (git push alone is not enough for GAS)
3. **GAS URL changes** when a new versioned deployment is published — update `GAS_URL` in both HTML files
4. **Dropdown cache** — if testing component changes, clear `localStorage.removeItem('dms_dd_v2')` in browser console
5. **No Hindi anywhere** — all messages, labels, emails must be English only
