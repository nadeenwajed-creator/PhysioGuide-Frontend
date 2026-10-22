# Frontend data and authentication integration

This document describes the current local implementation, not a live backend integration. The integrated Center scope is Dashboard, Appointments and Patients, including their existing quick-add forms. Remaining Center operations pages and the package's three therapist pages are not integrated by this correction batch.

## Current readiness by area

| Area | Implemented boundary | Remaining work |
| --- | --- | --- |
| Public pages | Existing presentation and navigation retained | No new backend features required by this batch |
| Authentication | Existing forms call `authService`; replaceable mock/API operations; session restoration, logout and role guards | Backend login/signup/session/logout contracts, approval handling, recovery flow and server security |
| Center core | Pages consume the shared workspace and service mutations; persistent mock adapter; loading/error/retry, empty results, validation and success feedback | Actual endpoint paths, DTO mappings, pagination strategy, uploads, server authorization and transactional conflicts |
| Therapist | Provisioned account login through Center Login; restricted signed-in destination; Center routes and service operations reject therapist management access | Package Profile, Messages and Conversation pages remain unintegrated. This destination is not a completed therapist portal |
| Patient | Patient signup/login and guarded signed-in destination | No Patient dashboard implementation exists in this working tree. Patient-owned pages and their API integrations remain separate work. The appointment request service is prepared and tested, but no patient booking UI is added |
| Admin | Existing empty layout/service scaffolding left unchanged | No integrated Admin portal, routes or auth contract in this working tree |

Existing empty data/service scaffolds are not evidence of implemented API integrations. The original untracked `centerDashboardService.js` is preserved; the integrated summary uses `centerSummaryService.js`. Patient/Admin and protected shared component sources were not rewritten.

## Data flow and adapter integration points

1. Auth forms call `src/services/authService.js`. Center components call the existing appointment/patient/therapist/service facades, which delegate to `src/services/centerPortalService.js`.
2. `src/services/runtime.js` chooses the data source. Local Vite development defaults to mocks. `VITE_DATA_MODE=api` disables mocks in development. Production builds always disable them. There is no fallback from failed API requests to fabricated success.
3. `src/services/api/httpClient.js` uses fetch with configurable `VITE_API_BASE_URL`, GET/POST/PUT/PATCH/DELETE, query encoding, JSON or FormData requests, 204 handling, cancellation, timeouts, headers and normalized errors. No endpoint paths are guessed. Environment files were not modified.
4. `src/services/api/backendContract.js` intentionally contains empty `authOperations` and `centerOperations`. Populate these only after agreement with the backend team. Each named operation supplies `request(...domainArgs)` returning `{ method, path, data?, query?, signal?, headers? }`, and `response(raw, ...domainArgs)` returning the existing frontend model. An optional `error(error)` maps backend field errors to stable frontend codes. An optional `execute(client, ...domainArgs)` can compose multiple requests for a workspace operation. This is the specific place to map backend IDs, dates, enum values, envelopes and upload responses.
5. `transportOptions` configures credentials and dynamic headers after the session contract is known. Defaults omit credentials. No JWT, refresh-token, cookie or CSRF contract is assumed. Do not put secrets in Vite variables; these are public browser configuration.

The central client rejects unconfigured requests and cross-origin endpoint overrides. A deployment with missing mappings reports unavailable; it does not grant a mock session. HTTP error bodies are available only to the adapter's error mapper; user-facing messages use translated codes.

### Frontend model contracts to map

- Auth operations: `loginPatient`, `loginCenter`, `registerPatient`, `registerCenter`, `restoreSession`, `logout`. Successful login returns `{ status: 'authenticated', role, session }`; session contains canonical `id`, `role`, `name`, `email`, and applicable `centerId`, `therapistId`, `patientId`. Restoration returns that identity or null. Registration returns `registered` for Patient or `pending-review` for Center; registration does not grant a Center session.
- Center operation names and role access are enumerated in `src/services/center/access.js`. Existing facade signatures are the domain interface. `getWorkspace(actor)` supplies the role-scoped workspace consumed by `CenterLayout` and `useCenter`; an API adapter may aggregate several REST responses to supply it. All actual network response mapping stays in adapters.
- Appointment records use stable IDs, `origin: 'center' | 'patient'`, a status, date/time and `durationMinutes`. Center creation is Confirmed; patient requests are Pending. Confirm is available only on pending patient requests. Forms cannot choose an origin or claim another identity.
- Mutation completion triggers a workspace refresh through the shared service subscription, keeping lists, counts, dropdown choices and Dashboard summaries synchronized. Mock cross-tab updates reload the repository; focus refreshes the current workspace/session.
- `prepareImage` is an adapter operation: mock mode persists image bytes as data URLs; a future API mapping must upload/return a stable asset reference, following the supplied backend contract.

### Server responsibilities

Frontend route and operation guards improve navigation but are not security boundaries. The backend must authenticate every request and enforce center ownership, roles, patient identity, approval status and allowed status transitions. It must resolve the actor from its authenticated session, not trust client-supplied IDs.

`appointmentRules.js` is the shared frontend conflict rule: pending/confirmed bookings cannot overlap for the same therapist or patient; adjacent slots are allowed. Creation and editing use the same rule, excluding the edited booking itself. The backend must enforce overlaps transactionally to handle concurrent users. Agree on timezone, date/time serialization, duration changes, availability and cancellation rules before mapping these fields. Browser storage cannot provide a database transaction across tabs.

Backend pagination, validation field mappings, stable IDs, file upload limits, authentication lifetime/revocation, approval transitions and error schemas remain unspecified. Pages currently use a complete workspace for local filtering/pagination; large production datasets may require a query-oriented service extension, without putting fetch logic into JSX.

## Local mock use

Use the existing application at `http://localhost:5175`. No separate application or login design is introduced.

| Account | Existing login page | Synthetic email |
| --- | --- | --- |
| Approved Center | Center Login | `center@example.com` |
| Patient | Patient Login | `patient@example.com` |
| Provisioned therapist | Center Login | `therapist3@example.com` |
| Pending Center (denied access) | Center Login | `pending@example.com` |

The public, synthetic test password is **`PhysioGuide123!`**. All mock accounts, including newly registered patients and Center-provisioned therapists, use this fixed test password. Signup still exercises the existing password/confirmation validation, but the submitted password is intentionally not retained or established as a durable credential. Use synthetic input only. This convention is confined to the development adapter/documentation; it is not a production authentication design.

Center signup remains pending and cannot acquire approved Center access. Patient signup creates active mock account metadata and can then use Patient Login. Therapist identities come from the Center's staff records; there is no public therapist signup. Duplicate account/staff emails are rejected. Unsupported roles are rejected. The limited Patient/Therapist destinations support session restoration and logout but do not imply that their full portals are finished.

### Persistence and failure behavior

Versioned repositories isolate these localStorage keys:

- `physioguide.mock.center.v1`: synthetic Center records and uploaded test image bytes.
- `physioguide.mock.accounts.v1`: synthetic registration metadata, without passwords.
- `physioguide.mock.session.v1`: expiring account ID marker, without tokens, passwords or a trusted role claim.

Session restoration resolves the canonical account/role; markers expire after 12 hours. `logout()` removes the marker and returns `/`; all implemented role layouts navigate to that Landing destination. Protected URLs still require authentication afterward. Logout does not delete Center records. Browser reloads preserve saved appointments, patients, notes, services and staff.

Saving writes the repository before publishing success. If browser storage is unavailable/full, the mutation rolls back and the UI reports an error. Missing storage initializes the seed once; corrupt/unsupported stored data produces an error instead of silently discarding it. Users can clear site storage themselves to reset synthetic fixtures; the UI does not expose a debug reset button. Persistence is local to this browser/profile/origin and is not a real backend, backup or multi-user database.

The unintegrated messaging adapter still contains temporary attachment object-URL behavior from the package. Durable messaging uploads and the three therapist interfaces require their own approved integration; this batch does not claim them complete. The existing Geoapify lookup remains in its dedicated service and is not replaced by the application API client.

## Verification

Run `npm.cmd run lint`, `npm.cmd run build`, and `node --test src/tests/public-auth/auth.test.js src/tests/integration/services.test.js src/tests/integration/refinements.test.js`.

Unit coverage includes transport/mapping errors, cancellation, role restrictions, pending accounts, signup metadata, expiry/logout, provisioning, appointment origin/transitions, creation/edit conflicts, persistence and rollback. Actual Chrome validation covers core page interactions, role navigation, filters, uploaded images, storage errors, English/Arabic, themes and the requested viewport sizes. Detailed run results and full-page/viewport screenshots are kept in the external review directory rather than committed into application source. Lint/build/overflow checks do not substitute for the user's visual approval.

## Center applications and approval

Center registration stores an application/account in the existing account repository, with a stable application ID, reserved Center ID, name, email, phone, address, optional coordinates, submission date, and explicit pending approval status. Passwords and confirmation fields are excluded. Pending/rejected identities cannot log in or restore a session, even if their ID is placed in a mock session marker.

The auth service exposes `listCenterApplications(status)`, `getCenterApplication(id)`, `approveCenterApplication(id)` and `rejectCenterApplication(id, reason)`. They require an Admin session; ordinary Center/Patient/Therapist sessions are rejected. These map to `listCenterApplications`, `getCenterApplication` and `reviewCenterApplication` in the existing auth adapter/operation map. No endpoint is specified. An approval creates the Center workspace through `activateMockCenter` and marks the application approved; rejection records the reason and review date. Only pending applications accept a decision. Repeated/conflicting decisions fail.

There is no Admin login, session contract or Admin UI in this working tree. The adapter operations are exercised with an injected test reviewer in automated/local browser tests, not a public approval button or a new Admin account. Future Admin integration must supply its authenticated session and UI before the service operations become usable through normal navigation. The real API must enforce reviewer permissions and make activation/approval transactional. Local mock role checks are not a security guarantee.

Activation is idempotent and happens before approval is published. If storage fails, access remains denied and review can be retried; an unused workspace may remain if the later account write fails. Browser storage does not provide a transaction across these records. Rejected decisions are terminal in this batch; resubmission/reopening policy belongs to the future Admin/backend contract.

The existing sample center retains `physioguide.mock.center.v1`. Newly approved centers use `physioguide.mock.center.v1:<centerId>` and start with their submitted profile and empty records, never another center's patients or appointments. Each Center adapter is scoped to its authenticated center ID. Profile names come from that workspace in Dashboard/Navbar/Sidebar and from the current profile during session restoration. Profile changes do not change the account's login email. Existing saved pending accounts from before this refinement may lack phone/address/coordinates; unknown historical fields are not fabricated or overwritten.

## List preferences and patient summary

Appointments and Patients use the same bottom pagination wrapper and shared Pagination component. The non-sensitive `physioguide-center-page-size` preference stores 10, 20 or 50 (default 10) across navigation/refresh. Filtering and sorting reset the page; shrinking results clamp it; range counts use the filtered records. Completed/Cancelled appointment actions are unchanged.

Patient Overview shows the total number of appointment records, including cancelled records, and the latest completed or confirmed booking whose local date/time is not in the future. Pending/cancelled bookings are not visits. With no previous visit, the translated empty value is shown. Full history appears only in the Appointments tab. Confirm the backend's attendance and timezone semantics when its contract is available.


## Remaining Center pages: service foundation

The service foundation is implemented; the five remaining page routes are not integrated yet.

- The remaining-page facade delegates replies to existing `updateReview(actor, id, { reply })`, deletion to `deleteCenterService`, and preferences to `saveCenterNotificationPreferences`. Reply editing replaces one string. No report action is exposed by this facade. Appointment-linked service deletion continues to reject with `linkedService`.
- Preferences accept boolean updates for `appointments`, `appointmentChanges`, `patients`, and `reviews`. Omitted and unknown stored keys are preserved. The existing patient-event mapping remains in place; new event-category wiring belongs to page integration. Preferences do not create or deliver notifications.
- `saveCenter` remains an acknowledged mutation returning no record in mock mode. Consumers refresh through the existing workspace subscription. Omitted hours retain their value; explicit `null` clears them. Optional gallery entries are validated and deduplicated. Coordinates require explicit confirmation; omitted coordinates remain unchanged and `null` removes the pin. Storage failure rolls back before publishing an update.
- `changeCenterPassword` is Center-only and always rejects with `passwordUnavailable` in mock mode. It neither stores credentials nor simulates a successful password change. A future backend operation must verify the current credential and apply the real security policy.
- `centerLocationService` reuses registration's geolocation/Geoapify boundary, retaining device accuracy. It constructs map links without requesting location, calling Geoapify, or loading map tiles automatically. The Settings UI must confirm coordinates and the Profile UI must require that confirmation before showing a map.
- `getReviewStatistics` derives the count, average and distribution from the full current review collection. Paged backend responses need a whole-center aggregate contract.

No endpoint paths or authentication contracts were added. Configure operation mappings in the existing `centerOperations` boundary when backend specifications are available. The underlying dormant reporting/messaging code remains outside this integration's user-facing scope.
