# Make the admin portal work against the backend

## Current state (verified)

- **Auth already works**: `/admin/login` → `loginAdmin` → `POST /api/Auth/login`, `RequireRole(["admin"])` guards all `/admin/*` routes, session role comes from the login response.
- **All 8 admin pages render hardcoded arrays** — filters, pagination, tabs, approval buttons, save buttons are inert. Nothing on the data side ever calls the backend.
- **Demo-mode gap**: `mockAuthAdapter` has no `loginAdmin` and `mockAccounts` has no admin account, so admin sign-in fails when no API URL is configured.
- Project conventions found: portals select data mode with `mockEnabled` (`VITE_DATA_MODE`, default `mock`), operations live in `backendContract.js` + mappers in `mappers.js`, services expose a `callX()` guarded by session role, pages use `Feedback` / `EmptyState` / `ConfirmDialog` / `Modal` / `FormField`, all copy via `t()` in `en.js`/`ar.js`.

## Approach & key decisions

1. **Data mode**: follow the portal convention — `VITE_DATA_MODE=mock` (default) serves bundled demo records so every page **works today**; setting `VITE_DATA_MODE=api` in `.env` switches all admin pages to the real endpoints (no code change). API mode never silently falls back to mock.
2. **One service, one contract**: new `adminService.js` (`callAdmin(method, …)`, session guard `role === 'admin'`), `adminOperations` in `backendContract.js`, admin mappers in `mappers.js`, mock records in `services/mock/adminData.js` shaped **identically** to the mappers' output (including server-like filtering/pagination), so the flip to API mode is seamless.
3. **i18n**: every new string goes into both `en.js` and `ar.js`; existing `admin.*` keys cover the spec'd UI.
4. **Scope of CTAs**: the two primary buttons get real modal forms ("Add physiotherapist", "New appointment"); the `...` action-menu cells stay as designed in the approved spec (the spec defines the icon but no menu contents — flagged, not invented).

## Files

| Action | File |
|---|---|
| Edit | [backendContract.js](src/services/api/backendContract.js) — add `adminOperations` (17 operations) |
| Edit | [mappers.js](src/services/api/mappers.js) — add `toAdminDashboard`, `toAdminCenters/Center/…`, `toAdminPatients`, `toAdminPhysiotherapists`, `toAdminAppointments`, `toAdminReviews`, `toAdminSettings` (lowercase status normalization, defensive field reads) |
| New | `src/services/adminService.js` — mode selection + admin-session guard |
| New | `src/services/mock/adminData.js` — demo data + query engine (search/filter/sort/paginate) |
| New | `src/pages/admin/useAdminQuery.js` — fetch hook (loading/error/retry) + search debounce helper |
| Edit | [mockAuthAdapter.js](src/services/auth/mockAuthAdapter.js), [mockAccounts.js](src/services/auth/mockAccounts.js) — add `loginAdmin` + demo admin account (admin@example.com) |
| Edit | all 8 pages under `src/pages/admin/` | 
| Edit | [en.js](src/locales/en.js), [ar.js](src/locales/ar.js) — new keys: loading/error/retry/empty, confirm-dialog texts, form labels, saved notice, sort options |
| Edit | `ListPages.css` (+ small additions in Dashboard/CenterDetail/Reviews css) — loading/error/empty block, missing badge variants (`confirmed/completed/cancelled/published/reported`), select-as-badge appearance, modal form grid |

## Page-by-page wiring

- **Dashboard** — fetches `getAdminDashboard(year)` (year dropdown refetches). Metrics, badge changes (↑/↓), appointment bar chart (data-driven month count, localized month labels), platform-health circle from payload; notifications/pending-approvals/activity from payload; activity timestamps formatted relatively in the active language; welcome name comes from the **admin session** instead of hardcoded "Maya".
- **Centers** — debounced search + status/specialty/city selects wired to query params, rows + `total` + filter options from the payload, pagination computed from `total/pageSize`, loading/error/empty states.
- **Center detail** — loads `GET` by route id (real name/ID/status/fields instead of hardcoded Al Noor), tabs functional (Overview key-values, Documents list, Photos grid from payload, each with empty state), Approve/Reject/Suspend → `ConfirmDialog` → `PUT …/status` → refetch; buttons disabled while busy; back-link unchanged.
- **Patients** — filters (search/status/city/sort) + pagination live; status badge becomes an interactive select → `PUT status` (Confirm dialog only when suspending).
- **Physiotherapists** — filters + pagination live; status select wired; **+ Add physiotherapist** opens a modal form (name, email, license, specialty, center) → `POST`, then refetch.
- **Appointments** — search/status/center/date-range filters + pagination; **+ New appointment** opens a modal fed by `GET …/options` (patients, centers, therapists filtered by center, services) → `POST`, then refetch.
- **Reviews** — summary cards (score, distribution, published/pending/reported) from payload; search/rating/status/sort filters; **Moderate** (→ publish) and **Remove** buttons → `ConfirmDialog` → `POST …/moderate` → refetch; pagination from `total`.
- **Settings** — loads `GET`; Edit toggles name/location inputs; notification toggles hold local state until **Save changes** → `PUT` + success feedback; **Change password** opens a modal reusing the existing `POST /api/Auth/change-password`; Manage 2FA stays as designed (no backend for it — listed below as optional).

## Verification

`npx eslint` on touched files → `npm run build` → browser pass: admin login, every page rendered in **English and Arabic** (RTL check), one filter + pagination + one mutation path exercised in mock mode. Any check that can't run will be reported, not implied.

## Deliverable for your backend developer (copy-paste)

All new endpoints are **admin-only**: `[Authorize(Roles = "Admin")]` (login already returns `role: "admin"`). Conventions: pagination via `?page=&pageSize=` (frontend default 5), list responses `{ "items": [...], "total": N, "filters": {...} }`, **status values lowercase** as listed, text fields may be a plain string or `{ "en": …, "ar": … }` (frontend localizes both), ids as strings.

1. `GET /api/admin/dashboard?year=2026` → `{ metrics: { activeCenters: {value, change}, registeredPatients: {…}, physiotherapists: {…} }, monthlyBookings: [12 nums], health: {percent, approvalResponse, satisfaction}, notifications: [{id, text, unread}], pendingApprovals: {total, centers, therapists, reportedReviews}, activity: [{id, text, at: ISO}] }` (`change` = percent number, `at` = ISO timestamp)
2. `GET /api/admin/centers?search&status&specialty&city&page&pageSize` → items `{id, name, manager, location, therapists, status}` (status ∈ pending/approved/rejected/suspended), `filters: {cities[], specialties[]}`
3. `GET /api/admin/centers/{id}` → `{id, name, imageUrl, status, location, manager, therapists, specialties[], submittedAt, documents: [{id, name}], photos: [{id, url}]}` (relative `/uploads/...` urls welcome — frontend resolves them)
4. `PUT /api/admin/centers/{id}/status` body `{status: approved|rejected|suspended, reason?}` → same shape as #3
5. `GET /api/admin/patients?search&status&city&sort&page&pageSize` → items `{id, name, email, age, city, appointments, lastVisit, status}` (status ∈ active/inactive/suspended; sort ∈ recent), `filters: {cities[]}`
6. `PUT /api/admin/patients/{id}/status` body `{status}` → updated patient
7. `GET /api/admin/physiotherapists?search&specialty&center&status&page&pageSize` → items `{id, name, license, specialty, center, rating, reviews, status}` (status ∈ active/pending/inactive), `filters: {specialties[], centers[]}`
8. `PUT /api/admin/physiotherapists/{id}/status` body `{status}` → updated therapist
9. `POST /api/admin/physiotherapists` body `{fullName, email, licenseId, specialty, centerId}` → created therapist
10. `GET /api/admin/appointments?search&status&center&from&to&page&pageSize` → items `{id, patient, center, therapist, service, datetime, status}` (status ∈ confirmed/pending/completed/cancelled), `filters: {centers[]}`
11. `GET /api/admin/appointments/options` → `{patients: [{id, name}], centers: [{id, name}], therapists: [{id, name, centerId}], services: [{id, name}]}` (for the create form)
12. `POST /api/admin/appointments` body `{patientId, centerId, therapistId, serviceId, date, time}` → created appointment
13. `GET /api/admin/reviews?search&rating&status&sort&page&pageSize` → `{ summary: {score, total, flaggedPercent, distribution: [5 nums], published, pending, reported}, items: [{id, name, context, text, rating, status, createdAt}] }` (status ∈ published/pending/reported; sort ∈ newest|oldest|highest)
14. `POST /api/admin/reviews/{id}/moderate` body `{action: approve|remove}` → updated review
15. `GET /api/admin/settings` → `{profile: {fullName, role, verified, lastSignIn, location, adminId}, security: {twoFactorEnabled}, notifications: {approvalRequests, appointmentUpdates, reportedReviews, systemAlerts}}`
16. `PUT /api/admin/settings` body `{profile?, notifications}` → same shape as #15
17. *(already in contract, may already exist)* `POST /api/Auth/change-password` `{currentPassword, newPassword}` — reused for the admin Change-password modal. **Optional**: `PUT /api/admin/2fa` for the Manage-2FA button.

Notes for the backend dev: `POST /api/Auth/login` with an admin account must return `role` (frontend lowercases it) — already handled; the older `/api/admin/center-applications*` endpoints in the contract stay untouched and separate from #1–4.