## 1. Repository, tooling and docs

| File | Status | What it does | Commit |
| --- | --- | --- | --- |
| `.gitignore` | modified | Also ignores `.freebuff/` and `.cloud-attachments/` (local agent output must not be committed again). | `0487074` |
| `.cloud-attachments/imported-conversation-1c3f120d410a137e9f4b41172177dbc97d01b056fa30ed52a8948778b0f30bf0.json` | added | Snapshot of an imported planning conversation, kept for reference. | `0487074` |
| `.cloud-attachments/plan.md` | added | Working plan notes for the admin/patient work. | `0487074` |
| `.cloud-attachments/plan32.txt` | added | Second batch of working notes (admin pages). | `0487074` |
| `api-contract.md` | modified | Documents the `?role=` query on `POST /api/Auth/login`, `POST /api/center/therapists`, `POST/PUT /api/center/workspace/patients`, and the `specialties` catalogue returned by `GET /api/center/workspace`. | `2ec6f4c` |
| `docs/FRONTEND_STRUCTURE_AND_USE_CASES.md` | added | Full frontend guide: routes, layouts, data layer, every screen and use case, component catalogue, accessibility, tests, and an appendix with every file's role. | `f639a0d` |
| `index.html` | modified | Loads the Google Identity Services client used by the challenge sign-in flow. | `9fd16fd` |
| `package.json`, `package-lock.json` | modified | Adds `@microsoft/signalr` for the messaging push channel. | `4af8923` |
| `scripts/pain-assessment-browser.mjs` | modified | Manual smoke script kept in step with the assessment flow. | `a3a0c55` |
| `scripts/patient-portal-browser.mjs` | modified | Manual smoke script kept in step with the patient portal. | `a3a0c55` |

## 2. Static assets

The whole `src/assets/` tree moved to the project root as `assets/`, so bundler-only content is no
longer mixed into source. Importers were updated in the same commit (`a137957`).

The 24 files below only moved; their bytes are unchanged, so they get no section of their own:

* `assets/logo/physioguide-icon.svg`
* `assets/documents/demo-session-note.txt`
* `assets/images/landing/physiotherapy-hero.webp`
* `assets/images/patient/dashboard-rehabilitation-hero.jpeg`
* `assets/images/patient/pain-assessment/body-front.png`, `body-front-clean.png`, `body-back.png`, `body-back-clean.png`, `pain-texture-background.jpg`
* `assets/images/center/back-pain.webp`, `knee-rehabilitation.webp`, `post-surgery.webp`, `pediatric-therapy.webp`, `sports-rehabilitation.webp`
* `assets/images/center/center-gym.webp`, `center-reception.webp`, `center-treatment-room.webp`, `dashboard-treatment-room.jpeg`
* `assets/images/center/portrait-01.webp`, `portrait-02.webp`, `portrait-03.webp`, `portrait-04.webp`, `portrait-05.webp`, `portrait-06.webp`

Files whose only change was the new asset path: `src/components/auth/AccountDestination.jsx`,
`src/components/auth/AuthShell.jsx`, `src/components/public/PublicHeader.jsx`,
`src/components/shared/Footer/Footer.jsx`, `src/components/patient/pain-assessment/BodyMap.jsx`,
`src/components/patient/pain-assessment/PainTexture.jsx`, `src/data/centerPortal.js`,
`src/pages/patient/Dashboard.jsx`, `src/pages/public/LandingPage.jsx`,
`src/pages/public/RoleSelect.jsx`.

## 3. Utilities

| File | Status | What it does | Commit |
| --- | --- | --- | --- |
| `src/utils/personImage.js` | added | Gives a person without a photo one stable portrait out of a 200-photo pool (seeded by id/email), so two records never share a face; also exposes `personFace` for seeded avatars. | `05c9199` |
| `src/utils/imageFile.js` | added | `fitImageFile` downscales and re-encodes oversized uploads to stay under the API's 2 MB cap; animated GIFs are passed through untouched. | `5f5d4cf` |
| `src/utils/centerFormat.js` | modified | `formatDate` now accepts an ISO string, a `Date` or a timestamp instead of assuming a string. | `402ac2b` |
| `src/utils/helpers.js` | deleted | Empty leftover module; nothing imported it. | `7cf2f3b` |

## 4. Localisation (`src/locales/`)

| File | Status | What it does | Commit |
| --- | --- | --- | --- |
| `en.js` | modified | English copy for the admin portal (dashboard, centers, patients, therapists, appointments, reviews, activity, settings, states) plus review, assessment and schedule strings. | `b4b428a` |
| `ar.js` | modified | The same keys in Arabic, including RTL copy for the admin tables. | `b4b428a` |
| `painAssessment.js` | modified | Strings for assessment history, saved results and the follow-up advice panel. | `273e097` |
| `patientRefinements.js` | modified | Copy for the patient refinements (saved centers, reviews). | `71ab8eb` |

## 5. API layer (`src/services/api/`)

| File | Status | What it does | Commit |
| --- | --- | --- | --- |
| `backendContract.js` | modified | Registers every new operation: admin dashboard/lists/CRUD, therapist schedules, appointments with status, review moderation and replies, activity log, saved centers, patient reviews and assessments. | `de73f8a` |
| `mappers.js` | modified | Normalises the new payloads (admin records, activity entries, schedules, review/assessment results, bilingual names) into the shapes the screens read. | `d0aa13c` |
| `gateway.js` | modified | Maps `413` to an upload error, races response-body reading against the timeout/abort signal, and swallows late aborts so they never become unhandled rejections. | `fedb733` |
| `validationFields.js` | modified | Adds field names (`birthdate`) and error names for Google sign-in, account conflicts, center approval, rate limits and admin record protection. | `0df11f5` |

## 6. Authentication

| File | Status | What it does | Commit |
| --- | --- | --- | --- |
| `src/services/auth/googleAuth.js` | added | Google Identity Services flow against `/api/Auth/google/*`: browser-held verifier plus server challenge/nonce, ticket exchange for a normal session, cancellation handling. | `9fd16fd` |
| `index.html` | modified | Loads the GIS script (see §1). | `9fd16fd` |
| `src/services/auth/apiAuthAdapter.js` | modified | Calls `POST /api/Auth/login?role=…` and builds a role-scoped session (`patientId`, `centerId`, `therapistId`, `adminId`) instead of assuming a patient. | `0e597ec` |
| `src/services/authService.js` | modified | `loginAdmin`, admin-aware adapter choice, and `getAuthenticatedDestination` so each role lands on its own portal (`/admin/dashboard` etc.). | `edebc28` |
| `src/services/auth/mockAccounts.js` | modified | Adds the demo admin account (`admin@example.com`). | `37290f6` |
| `src/services/auth/mockAuthAdapter.js` | modified | Exposes `loginAdmin` for the demo adapter. | `37290f6` |
| `src/services/auth/centerLocation.js` | modified | Keyless OpenStreetMap (Nominatim) reverse geocoder used when no Geoapify key is configured. | `1bdb229` |
| `src/services/centerLocationService.js` | modified | Keyless Nominatim address search with the same fallback, so registration keeps working without a key. | `1bdb229` |
| `src/components/auth/AuthForm.jsx` | modified | Role-aware sign-in/sign-up (admin copy, no Google for admin), Google button and challenge handling, new error rendering. | `73e4a2a` |
| `src/components/auth/AuthForm.css` | modified | Styles for the Google button and its status/error lines. | `73e4a2a` |
| `src/pages/auth/AdminLogin.jsx` | modified | Mounts `<AuthForm role="admin" mode="login" />` and links back to the public entry. | `2894bf2` |

## 7. Admin portal

### Data and shared pieces

| File | Status | What it does | Commit |
| --- | --- | --- | --- |
| `src/services/mock/adminData.js` | added | Mutable demo fixtures for every admin screen, shaped exactly like the API mappers so `VITE_DATA_MODE` only changes the source. | `ba7804c` |
| `src/services/crud/adminService.js` | added | `callAdmin` dispatcher: role check, mock/API switch, one entry point for every admin read and write. | `0f15fec` |
| `src/pages/admin/useAdminQuery.js` | added | Loads one admin operation, keeps previous rows while reloading, exposes retry and `errorText`; also `useDebouncedValue` for search. | `d65d37d` |
| `src/pages/admin/AdminUI.jsx` | added | Admin primitives: `QueryState` (loading/error/empty), `RecordDialog` (read-only rows), `AdminPagination`. | `a0bceec` |
| `src/pages/admin/AdminUI.css` | added | Styles for the read-only record rows used by `RecordDialog` and the detail dialogs. | `a0bceec` |
| `src/pages/admin/AdminRecordDialogs.jsx` | added | Create/edit forms (center, patient, therapist, appointment) sharing one dialog shell that reports save errors inline. | `6064435` |
| `src/pages/admin/AdminViewDialogs.jsx` | added | Read-only detail dialogs reusing the center layouts (patient, therapist, appointment). | `0fea04d` |
| `src/pages/admin/AdminViewDialogs.css` | added | Layout for those detail sections. | `0fea04d` |
| `src/pages/admin/ListPages.css` | added | Table, filter bar, toolbar and responsive rules shared by every admin list page. | `ebcb1d7` |
| `src/pages/admin/activityLinks.js` | added | Maps an activity kind + id to the route it should open; one place to add a new event kind. | `e5ee016` |
| `src/layouts/AdminLayout.jsx` | modified | Admin shell: sidebar navigation, search, bell with admin notification routes, profile menu, logout confirm, realtime refresh. | `12508bb` |
| `src/routes/AdminRoutes.jsx` | added | `/admin/login` plus the guarded admin tree (dashboard, centers, center detail, patients, therapists, appointments, reviews, activity, settings). | `86ba3dd` |
| `src/routes/AppRoutes.jsx` | modified | Mounts the admin route group. | `86ba3dd` |

### Screens

| File | Status | What it does | Commit |
| --- | --- | --- | --- |
| `src/pages/admin/Dashboard.jsx` | added | KPIs, charts, recent activity feed and pending-approval breakdown. | `5a69cf2` |
| `src/pages/admin/Dashboard.css` | added | Dashboard grid, KPI cards, chart and activity styles. | `5a69cf2` |
| `src/pages/admin/Centers.jsx` | added | Center list with search/filter, logo fallback, row actions (view/edit/delete) and pagination. | `cfcb3c4` |
| `src/pages/admin/CenterDetail.jsx` | added | Center profile, staff, services and approval status change. | `0c32207` |
| `src/pages/admin/CenterDetail.css` | added | Detail page layout. | `0c32207` |
| `src/pages/admin/Patients.jsx` | added | Patient list with actions and seeded avatars. | `6e059e6` |
| `src/pages/admin/Physiotherapists.jsx` | added | Therapist list, verification status and record actions. | `cb10b92` |
| `src/pages/admin/Appointments.jsx` | added | Appointment list with filters, status changes and CRUD dialogs. | `9e50110` |
| `src/pages/admin/Reviews.jsx` | added | Review moderation with reviewer avatars and reported-review handling. | `ac93a39` |
| `src/pages/admin/Reviews.css` | added | Review cards and moderation layout. | `ac93a39` |
| `src/pages/admin/Activity.jsx` | added | Full activity log, newest first, server-side paging. | `e5ee016` |
| `src/pages/admin/Settings.jsx` | added | Admin profile (name/phone), password change and notification preferences. | `83d5aaf` |
| `src/pages/admin/Settings.css` | added | Settings forms and photo upload styles. | `83d5aaf` |

## 8. Services (`src/services/`)

| File | Status | What it does | Commit |
| --- | --- | --- | --- |
| `crud/patientAssessmentService.js` | added | `submitAssessment`, `getAssessmentHistory`, `getAssessment` wrappers. | `e9ae2c0` |
| `crud/notificationService.js` | added | Notification read/preferences calls, including the admin bell endpoints. | `a30f447` |
| `notificationService.js` | deleted | Superseded by the wrapper above. | `a30f447` |
| `centerService.js` | deleted | Empty file, never imported. | `7cf2f3b` |
| `reviewService.js` | deleted | Empty file, never imported. | `7cf2f3b` |
| `messagingRealtime.js` | added | SignalR lifecycle (start/stop/reconnect) and one short-trailing workspace refresh per push event, so both sides see messages immediately. | `4af8923` |

### Moved into `src/services/crud/`

All of these are pure moves (`git log --follow` keeps history); call sites were updated in the same
commit `ec496fe`.

Nine services moved without changing what they expose (imports were renamed, two gained an export):

* `services/appointmentService.js` → `services/crud/appointmentService.js`
* `services/centerPortalService.js` → `services/crud/centerPortalService.js` (now caches one adapter per center)
* `services/centerRemainingService.js` → `services/crud/centerRemainingService.js`
* `services/messageService.js` → `services/crud/messageService.js`
* `services/patientAccountService.js` → `services/crud/patientAccountService.js`
* `services/patientDiscoveryService.js` → `services/crud/patientDiscoveryService.js` (now also saved centers and reviews)
* `services/patientService.js` → `services/crud/patientService.js`
* `services/serviceService.js` → `services/crud/serviceService.js`
* `services/therapistService.js` → `services/crud/therapistService.js` (now also `prepareTherapistImage`)

## 9. Center and therapist portal

| File | Status | What it does | Commit |
| --- | --- | --- | --- |
| `src/components/center/TherapistScheduleForm.jsx` | added | Weekly working-hours dialog (Saturday–Thursday, Friday last): per-day on/off, start/end, sends a diff on save. | `d9b6b2f` |
| `src/components/center/CenterUI.css` | modified | Styles for the services checklist and the schedule rows. | `d9b6b2f` |
| `src/services/center/therapistRecords.js` | modified | `defaultTherapistSchedule` so a therapist without a stored week still has one. | `d9b6b2f` |
| `src/services/center/access.js` | modified | Allowed operations extended with schedule, saved centers, reviews, assessments, therapist notification preferences. | `d9b6b2f` |
| `src/services/center/mockCenterAdapter.js` | modified | Therapist create/update validation (`specialtyId`, password on create, personal fields immutable on edit). | `d9b6b2f` |
| `src/components/center/RecordForm.jsx` | modified | Handles `specialtyId`, initial password, `serviceIds` and custom select change handlers for center-created records. | `8daccf7` |
| `src/components/center/CenterUI.jsx` | modified | `Pager` accepts a caller-supplied `rangeLabel` (admin's own "of N" copy); `Panel` gained a `viewAllLink` parameter that nothing reads yet — the dead prop behind the existing lint warning. | `673f102` |
| `src/components/center/remaining/CenterInformationForm.jsx` | modified | Reads both API strings and mock bilingual objects for name/address/about. | `673f102` |
| `src/layouts/CenterLayout.jsx` | modified | Starts the realtime channel, refreshes once data exists, and keeps the bell/avatar in step. | `64d618f` |
| `src/pages/physiotherapist/Settings.jsx` | added | Therapist settings page: notification switches that drive the navbar bell. | `f744462` |
| `src/routes/CenterRoutes.jsx` | modified | Adds the therapist `settings` route. | `f744462` |
| `src/pages/physiotherapist/Profile.jsx` | modified | Reads bilingual names from either shape and uses `prepareTherapistImage` for photo uploads. | `6d7c6d5` |
| `src/pages/center/Physiotherapists.jsx` | modified | Opens the schedule dialog and manages therapist services from the row menu. | `8e677ac` |
| `src/pages/center/Reviews.jsx` | modified | Seeded reviewer avatars and the new CRUD import path. | `b90607a` |
| `src/pages/center/Dashboard.jsx` | modified | New hero asset path and seeded patient avatars. | `1ae5420` |
| `src/pages/center/CenterProfile.jsx` | modified | Follows the services into `services/crud/`. | `1ae5420` |
| `src/components/center/AppointmentsTable.jsx` | modified | Passes `seed` so each patient keeps one avatar. | `8e2c86b` |
| `src/components/center/PatientDetails.jsx` | modified | Seeded avatar and the new `patientService` path. | `8e2c86b` |
| `src/pages/center/Patients.jsx` | modified | Seeded avatars in the patient table. | `8e2c86b` |
| `src/pages/center/Appointments.jsx` | modified | New `appointmentService` path. | `ec496fe` |
| `src/components/center/remaining/NotificationPreferences.jsx` | modified | New `centerRemainingService` path. | `ec496fe` |
| `src/components/center/remaining/SecurityForm.jsx` | modified | New `centerRemainingService` path. | `ec496fe` |

## 10. Patient portal

| File | Status | What it does | Commit |
| --- | --- | --- | --- |
| `src/components/patient/ReviewModal.jsx` | added | Rating + optional comment dialog; the server attaches the review to the newest unreviewed visit. | `be50014` |
| `src/components/patient/PatientReview.css` | added | Review dialog and review-card styles. | `be50014` |
| `src/pages/patient/Appointments.jsx` | modified | Reformatted, and uses the portrait fallback for center/therapist images. | `6c12f67` |
| `src/pages/patient/CenterDetails.jsx` | modified | "Write review" button opening the modal, review notice, portrait fallbacks. | `00d5420` |
| `src/components/patient/useDiscovery.js` | modified | Loads saved-center ids together with discovery and merges them into `favoriteIds`. | `e3536f4` |
| `src/pages/patient/PainAssessment.jsx` | modified | Submits assessments and browses the saved history. | `d0ecb31` |
| `src/components/patient/pain-assessment/AssessmentResult.jsx` | modified | Result panels with help/follow-up sections. | `d0ecb31` |
| `src/components/patient/pain-assessment/PainAssessment.css` | modified | Validation error and result-help styles. | `d0ecb31` |
| `src/services/patient/mockPatientOperations.js` | modified | Stores submitted assessments per patient so history survives a reload. | `d0ecb31` |
| `src/services/patient/painAssessmentModel.js` | modified | Assessment definition, scoring and result building. | `d0ecb31` |
| `src/services/patient/specialtyMatching.js` | modified | Symptom/specialty scoring plus care-service rules. | `74d114a` |
| `src/components/patient/AccountUI.jsx` | modified | Portrait fallback for the account header image. | `05c9199` |
| `src/components/patient/ProfileEditor.jsx` | modified | Portrait fallback and the new `patientAccountService` path. | `05c9199` |
| `src/pages/patient/PhysiotherapistDetails.jsx` | modified | Portrait fallback and the new `patientDiscoveryService` path. | `05c9199` |
| `src/components/patient/BookingModal.jsx` | modified | New `appointmentService` path. | `ec496fe` |
| `src/components/patient/DiscoveryUI.jsx` | modified | New `patientDiscoveryService` path. | `ec496fe` |
| `src/components/patient/PatientSecurityForm.jsx` | modified | New `patientAccountService` path. | `ec496fe` |
| `src/components/patient/usePatientAccount.js` | modified | Follows `patientAccountService` / `patientDiscoveryService`. | `ec496fe` |
| `src/components/patient/usePatientAvailability.js` | modified | Follows `patientDiscoveryService`. | `ec496fe` |
| `src/pages/patient/Settings.jsx` | modified | Follows `patientAccountService`. | `ec496fe` |

## 11. Shared components and messaging

| File | Status | What it does | Commit |
| --- | --- | --- | --- |
| `src/components/shared/ActionsMenu/ActionsMenu.jsx` | modified | Merged row menu: `portal` renders the panel into `document.body` with viewport placement/flip-above, `compact` gives the 38px ghost trigger; keyboard nav, outside-click, Escape with focus return, `dir`-aware anchoring. | `0053022` |
| `src/components/shared/ActionsMenu/ActionsMenu.css` | modified | Panel base + `--portal` / `--compact` variants, 44px touch targets, `box-sizing` reset for the portaled panel. | `0053022` |
| `src/components/shared/Avatar/Avatar.jsx` | modified | Deterministic seeded faces from `personImage` when there is no photo. | `8e2c86b` |
| `src/components/shared/StatusBadge/StatusBadge.jsx` | modified | Renders a single tag per status, including `published` / `hidden`. | `490bade` |
| `src/components/shared/StatusBadge/StatusBadge.css` | modified | One-tag sizing and the new status colours. | `490bade` |
| `src/components/shared/NotificationsDropdown/NotificationsDropdown.jsx` | modified | Lists only unread items and maps the new notification types (appointments, reviews, verification, services, patients, center approval) to icons/tones. | `ca3b4ff` |
| `src/components/shared/FilterSelect/FilterSelect.jsx` | modified | De-duplicates options so repeated labels cannot collide as React keys. | `0c19273` |
| `src/components/shared/Button/Button.css` | modified | `white-space: nowrap` so labels never wrap inside a button. | `20caa8d` |
| `src/components/shared/MessageInput/MessageInput.jsx` | modified | Matches server limits: 2 MB per attachment, 2000 characters per message. | `77c7237` |
| `src/pages/physiotherapist/Conversation.jsx` | modified | Shows a loading state for 3s before declaring a just-opened conversation missing. | `f8b2a66` |
| `src/components/shared/Sidebar/Sidebar.jsx` | modified | Whitespace/formatting only — behaviour unchanged. | `e4c1d42` |
| `src/components/shared/ProfileMenu/ProfileMenu.jsx` | modified | Whitespace/formatting only — behaviour unchanged. | `e4c1d42` |

## 12. Tests

All under `src/tests/`, updated in `a3a0c55` for the new `services/crud/` paths and the added
operations:

| File | Suite |
| --- | --- |
| `integration/remaining-center.test.js` | Composition rules and remaining center operations. |
| `integration/services.test.js` | Service registry and adapters. |
| `integration/therapist-profile.test.js` | Therapist profile and image preparation. |
| `patient-phase1/account.test.js` | Patient account read/write. |
| `patient-phase1/integration.test.js` | End-to-end patient flows. |
| `patient-phase1/pain-assessment.test.js` | Assessment scoring and history. |
| `patient-phase1/refinements.test.js` | Saved centers, reviews, refinements. |

---

## 13. Verifying this rewrite

```bash
# history after the baseline
git log --oneline 293a366..HEAD            # 70 commits: 69 replay commits + this document
git log --oneline backup/pre-rewrite-293a366..c44e75c   # the old 41 commits

# proof that no content changed (HEAD~1 = last replay commit, before this file)
git diff --stat backup/pre-rewrite-293a366 HEAD~1   # 80 files, +160 lines (header comments only)

# one commit per section, e.g. the actions menu merge
git show --stat 0053022
```

The rewrite is **local only**. The remote still holds the old 41 commits, so publishing this
history needs a force-push (`git push --force-with-lease origin feature/center-core-pages`) once
the history is agreed on.
