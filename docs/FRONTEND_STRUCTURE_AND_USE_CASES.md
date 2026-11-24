# PhysioGuide — Frontend Structure & Use Cases

> **Scope.** This document describes the React single-page application in `PhysioGuide-Frontend/`.
> It was produced by reading the source: entry point, router, every layout, every page, every
> component, the whole service layer, the mock layer and the tests.
> Companion document: `gysi-proj/docs/BACKEND_STRUCTURE_AND_USE_CASES.md`.
>
> It supersedes `docs/PROJECT_STRUCTURE.md`, which is older and still claims the admin portal is not
> implemented and that `assets/` lives under `src/`.

---

## Table of contents

1. [At a glance](#1-at-a-glance)
2. [Folder structure](#2-folder-structure)
3. [Bootstrap and providers](#3-bootstrap-and-providers)
4. [Routing](#4-routing)
5. [Layouts and navigation](#5-layouts-and-navigation)
6. [Styling, theme and internationalisation](#6-styling-theme-and-internationalisation)
7. [Data layer](#7-data-layer)
8. [Screens and use cases](#8-screens-and-use-cases)
9. [Component catalogue](#9-component-catalogue)
10. [Hooks](#10-hooks)
11. [Forms, validation and UX rules](#11-forms-validation-and-ux-rules)
12. [Accessibility](#12-accessibility)
13. [Tests, lint and build](#13-tests-lint-and-build)
14. [Backend integration map](#14-backend-integration-map)
15. [Known gaps and limitations](#15-known-gaps-and-limitations)
16. [Appendix — every file and its role](#16-appendix--every-file-and-its-role)

---

## 1. At a glance

| Aspect | Value |
| --- | --- |
| Framework | React 19.2 (`react`, `react-dom`) |
| Build | Vite 8.3 + `@vitejs/plugin-react` 6.1 |
| Router | `react-router-dom` 7.18 (declarative `<Routes>`, no data router) |
| Styling | Bootstrap 5.3 + `react-bootstrap` 2.10, hand-written CSS per feature |
| Icons | Font Awesome 7 (`@fortawesome/*`) |
| i18n | `i18next` 26 + `react-i18next` 17, English + Arabic with RTL |
| Realtime | `@microsoft/signalr` 10 |
| Fonts | Inter Variable, Noto Sans Arabic Variable (self-hosted via Fontsource) |
| Language | JavaScript + JSX, ES modules, no TypeScript |
| Dev port | **5175**, `strictPort: true` |
| Entry | `index.html` → `src/main.jsx` → `App.jsx` → `AppRoutes` |
| Tests | Plain Node test runner (`node --test`), no test script in `package.json` |
| Lint | ESLint 10 flat config |
| Data modes | **mock** (default) or **api**, selected by `VITE_DATA_MODE` |

### Scripts

```bash
npm install
npm run dev       # vite, http://localhost:5175
npm run build     # production bundle in dist/
npm run preview   # serve the built bundle
npm run lint      # eslint .
```

There is no `npm test`. Tests are run directly:

```bash
node --test src/tests/patient-phase1/account.test.js
# ...one file at a time, or a glob your shell expands
```

### Environment variables

Vite only exposes `VITE_*` values to the browser.

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_DATA_MODE` | no (default `mock`) | `mock` uses browser-stored demo data; anything else uses the API |
| `VITE_API_BASE_URL` | yes in API mode | Absolute API origin, e.g. `http://localhost:5222` |
| `VITE_SIGNALR_HUB_URL` | no | Overrides the derived hub URL (`${API}/hubs/messages`) |
| `VITE_GOOGLE_CLIENT_ID` | for Google sign-in | Google Identity Services Web Client ID (falls back to a build-time constant in `googleAuth.js`) |
| `VITE_GEOAPIFY_API_KEY` | no | Geocoding/search; without it the location picker uses Nominatim + OpenStreetMap |

`.env` files are git-ignored; never put secrets in `VITE_*` values because they ship to the browser.

### Browser requirements

- Modern evergreen browser (ES2022, `crypto.randomUUID`, `structuredClone` in tests).
- `localStorage` is used for mock data and for the real session; private mode still works for a single
  tab because failures are swallowed, but the session is not persisted.
- Google sign-in loads `https://accounts.google.com/gsi/client` from `index.html`.

---

## 2. Folder structure

```text
PhysioGuide-Frontend/
├── assets/                             static files imported by the app (outside src/)
│   ├── documents/demo-session-note.txt
│   ├── images/center/                  13 therapy/center/portrait images (.webp/.jpeg)
│   ├── images/landing/physiotherapy-hero.webp
│   ├── images/patient/dashboard-rehabilitation-hero.jpeg
│   ├── images/patient/pain-assessment/body-front.png, body-front-clean.png,
│   │                                   body-back.png, body-back-clean.png,
│   │                                   pain-texture-background.jpg
│   └── logo/physioguide-icon.svg
├── docs/
│   ├── AUTHENTICATION.md
│   ├── BACKEND_READINESS.md
│   ├── PROJECT_STRUCTURE.md           (older; superseded by this file)
│   └── FRONTEND_STRUCTURE_AND_USE_CASES.md   ← this file
├── scripts/
│   ├── pain-assessment-browser.mjs      manual browser smoke script
│   └── patient-portal-browser.mjs       manual browser smoke script
├── index.html
├── vite.config.js
├── eslint.config.js
├── package.json
├── package-lock.json
└── src/
    ├── App.jsx
    ├── main.jsx
    ├── components/
    │   ├── auth/                        AuthShell, AuthForm, AccountDestination (+css)
    │   ├── center/                      AppointmentDetails, AppointmentFilters, AppointmentsTable,
    │   │                                CenterUI, ClinicLocationEditor, ClinicMap, PatientDetails,
    │   │                                RecordForm, TherapistScheduleForm, useCenter,
    │   │                                usePagination, useUnsavedChanges (+css)
    │   │   └── remaining/               CenterInformationForm, LocationPanel,
    │   │                                NotificationPreferences, SecurityForm (+css)
    │   ├── patient/                     AccountUI, AppointmentDates, BookingModal, CenterGallery,
    │   │                                DiscoveryUI, PatientSecurityForm, ProfileEditor,
    │   │                                ReviewModal, ReviewsCarousel, TimeRail,
    │   │                                serviceIcon, useDiscovery, usePatientAccount,
    │   │                                usePatientAvailability, usePatientLabels,
    │   │                                useVisibleItems (+css)
    │   │   └── pain-assessment/         AssessmentResult, BodyMap, PainTexture,
    │   │                                bodyHotspots (+css)
    │   ├── public/                      PublicHeader (+css)
    │   └── shared/                      24 reusable components, each with its own css:
    │       ActionsMenu, AttachmentCard, Avatar, Button, ChatHeader, ConversationItem,
    │       ConversationList, FilterSelect, Footer, FormField, LanguageSwitcher, MessageBubble,
    │       MessageInput, Modal, Navbar, NotificationsDropdown, Pagination, ProfileMenu,
    │       QuickSettings, RatingStars, SearchBar, Sidebar, StatusBadge, ThemeToggle
    ├── context/
    │   ├── AuthContext.jsx              useAuth() over the auth store
    │   ├── LanguageContext.jsx          i18n, direction, persistence
    │   └── ThemeContext.jsx             light/dark, persistence
    ├── data/
    │   ├── appointments.js              empty placeholder (0 lines)
    │   ├── centers.js                   empty
    │   ├── dashboard.js                 empty
    │   ├── messages.js                  empty
    │   ├── notifications.js             empty
    │   ├── patients.js                  empty
    │   ├── physiotherapists.js          empty
    │   ├── reviews.js                   empty
    │   ├── services.js                  empty
    │   └── centerPortal.js              mock center-portal seed/exports
    ├── layouts/
    │   ├── AdminLayout.jsx              admin shell (no separate css)
    │   ├── CenterLayout.jsx / .css      shared shell for center + patient + therapist
    │   ├── PatientLayout.jsx            wraps CenterLayout portal="patient"
    │   ├── TherapistLayout.jsx          wraps CenterLayout portal="physiotherapist"
    │   └── PublicLayout.jsx / .css      public header/footer, titles, skip link
    ├── locales/
    │   ├── en.js                        English strings
    │   ├── ar.js                        Arabic strings
    │   ├── painAssessment.js            assessment-specific copy (EN/AR)
    │   └── patientRefinements.js        patient portal refinements (EN/AR)
    ├── pages/
    │   ├── admin/                       Activity, AdminRecordDialogs, AdminUI, AdminViewDialogs,
    │   │                                Appointments, CenterDetail, Centers, Dashboard, Patients,
    │   │                                Physiotherapists, Reviews, Settings,
    │   │                                activityLinks, useAdminQuery (+css)
    │   ├── auth/                        AdminLogin, CenterLogin, CenterSignup,
    │   │                                PatientLogin, PatientSignup
    │   ├── center/                      Appointments, CenterProfile, Dashboard, Patients,
    │   │                                Physiotherapists, Reviews, Services, Settings (+css)
    │   ├── error/                       ErrorPage (+css)
    │   ├── patient/                     Appointments, CenterDetails, Dashboard, FindCenters,
    │   │                                PainAssessment, PhysiotherapistDetails, Profile,
    │   │                                Settings
    │   ├── physiotherapist/             Conversation, Messages, Profile, Settings (+css)
    │   └── public/                      CenterIntro, LandingPage, PatientIntro, RoleSelect (+css)
    ├── routes/
    │   ├── AppRoutes.jsx                aggregates the five route groups
    │   ├── PublicRoutes.jsx
    │   ├── PatientRoutes.jsx
    │   ├── CenterRoutes.jsx             center + therapist portals
    │   ├── AdminRoutes.jsx
    │   ├── ErrorRoutes.jsx
    │   ├── RequireRole.jsx              auth/role guard
    │   └── RoutePlaceholders.jsx        unused placeholder components
    ├── services/
    │   ├── authService.js               auth store + adapters + destinations
    │   ├── runtime.js                   data mode + http client instance
    │   ├── api/
    │   │   ├── backendContract.js       every operation → method/path/mapper
    │   │   ├── gateway.js               fetch, auth header, refresh retry, error mapping
    │   │   ├── httpClient.js            thin wrapper around the gateway
    │   │   ├── mappers.js               API payload → UI models
    │   │   ├── operationAdapter.js      operation map → callable adapter
    │   │   ├── serviceError.js          ServiceError + normaliser
    │   │   └── validationFields.js      field-error mapping
    │   ├── auth/
    │   │   ├── apiAuthAdapter.js        session persistence for API mode
    │   │   ├── authErrors.js            AuthServiceError + normalizeAuthError
    │   │   ├── centerLocation.js        registration address → coordinates
    │   │   ├── googleAuth.js            Google Identity Services flow
    │   │   ├── mockAccounts.js          demo account fixtures
    │   │   ├── mockAuthAdapter.js       demo login/register/restore
    │   │   └── session.js               localStorage session
    │   ├── center/
    │   │   ├── access.js                per-role operation allow-list
    │   │   ├── appointmentRules.js      status actions + overlap detection
    │   │   ├── messagingModel.js        conversation/message view models
    │   │   ├── messagingOperations.js   send/read operations shared by portals
    │   │   ├── mockCenterAdapter.js     mock center operations
    │   │   ├── remainingOperations.js   preferences/password/coordinates
    │   │   ├── therapistNotifications.js therapist bell mapping
    │   │   └── therapistRecords.js      therapist rows for center pages
    │   ├── crud/                        12 page-facing services (see §7.6)
    │   │   ├── adminService.js
    │   │   ├── appointmentService.js
    │   │   ├── centerPortalService.js
    │   │   ├── centerRemainingService.js
    │   │   ├── messageService.js
    │   │   ├── notificationService.js
    │   │   ├── patientAccountService.js
    │   │   ├── patientAssessmentService.js
    │   │   ├── patientDiscoveryService.js
    │   │   ├── patientService.js
    │   │   ├── serviceService.js
    │   │   └── therapistService.js
    │   ├── mock/
    │   │   ├── accountRepository.js
    │   │   ├── adminData.js
    │   │   ├── browserStore.js
    │   │   ├── centerRepository.js
    │   ├── patient/
    │   │   ├── accountModel.js          appointment grouping + profile rules
    │   │   ├── discoveryModel.js        filtering/sorting helpers
    │   │   ├── mockPatientAccount.js
    │   │   ├── mockPatientOperations.js
    │   │   ├── notificationPolicy.js    preference mapping + reminders
    │   │   ├── painAssessmentModel.js   questions, scoring, care text
    │   │   └── specialtyMatching.js     symptom → specialty suggestions
    │   ├── centerLocationService.js     geocoding (Geoapify → Nominatim → OSM)
    │   ├── centerSummaryService.js      center dashboard derivations
    │   ├── messagingRealtime.js         SignalR connection lifecycle
    │   └── patientSummaryService.js     patient dashboard derivations
    ├── styles/
    │   ├── variables.css                design tokens
    │   ├── light.css / dark.css         theme overrides
    │   ├── global.css                   base/reset/typography
    │   └── responsive.css               breakpoints
    ├── tests/
    │   ├── integration/                 messaging, consistency, refinements,
    │   │                                remaining-center, services, therapist-notifications,
    │   │                                therapist-profile
    │   └── patient-phase1/              account, discovery, integration,
    │   │                                pain-assessment, refinements
    └── utils/
        ├── authValidation.js
        ├── centerFormat.js
        ├── imageFile.js
        ├── messageFormat.js
        └── personImage.js
```

---

## 3. Bootstrap and providers

`src/main.jsx`:

1. Imports Bootstrap CSS, the two Fontsource variable fonts (`inter`, `noto-sans-arabic`) and four global
   stylesheets: `variables.css`, `global.css`, `light.css`, `dark.css`. (Font Awesome is used through
   `@fortawesome/react-fontawesome`, which needs no CSS import. `styles/responsive.css` exists but is
   **not imported anywhere** — see §15.)
2. Renders `<App />` inside `StrictMode` → `BrowserRouter` → `ThemeProvider` → `LanguageProvider`.
   There is no `AuthProvider`: auth is a module-level external store consumed with `useAuth()`.
3. i18next is initialised by the language module imported by the provider, not in `main.jsx`.

`src/App.jsx` renders `<AppRoutes />`.

Provider responsibilities:

| Provider | File | Responsibility |
| --- | --- | --- |
| Router | `react-router-dom` | Declarative routes; no loaders/actions |
| Language | `context/LanguageContext.jsx` | `language` (`en`/`ar`), `dir`, `t`, persistence in `localStorage`, `document.documentElement.lang/dir` |
| Theme | `context/ThemeContext.jsx` | `theme` (`light`/`dark`), toggle, persistence, `data-theme`/class on `<html>` |
| Auth | `context/AuthContext.jsx` | `{ status, session, error }` from `useSyncExternalStore`; triggers `restoreSession()` once |

`AuthContext` exposes only `useAuth()`. It is a *store subscription*, not a context value: the actual
state lives in `services/authService.js`, so non-React code (gateway, adapters) can read/publish the
same session.

Auth status values: `loading` → `authenticated` / `anonymous`; `error` carries an auth error code when
restoration failed (for example `unavailable`).

---

## 4. Routing

All routes are declared as JSX `<Route>` elements. There is no lazy loading and no route-level data
fetching; each page loads its own data.

### 4.1 Complete route table

| Path | Layout | Guard | Screen |
| --- | --- | --- | --- |
| `/` | PublicLayout | — | Landing page |
| `/choose-role` | PublicLayout | — | Role selection |
| `/patient/login` | PublicLayout → AuthShell | — | Patient login |
| `/patient/signup` | PublicLayout → AuthShell | — | Patient registration |
| `/center/login` | PublicLayout → AuthShell | — | Center **and therapist** login |
| `/center/signup` | PublicLayout → AuthShell | — | Center registration |
| `/admin/login` | PublicLayout → AuthShell | — | Admin login |
| `/404` | PublicLayout | — | Not found |
| `/403` | PublicLayout | — | Forbidden |
| `/500` | PublicLayout | — | Server error |
| `/offline` | PublicLayout | — | Offline |
| `/maintenance` | PublicLayout | — | Maintenance |
| `*` | PublicLayout | — | Not found (catch-all) |
| `/patient` (index) | — | `RequireRole ['patient']` → `/patient/login` | Redirect to `dashboard` |
| `/patient/dashboard` | PatientLayout | patient | Patient dashboard |
| `/patient/centers` | PatientLayout | patient | Find centers |
| `/patient/centers/:centerId` | PatientLayout | patient | Center details |
| `/patient/centers/:centerId/therapists/:therapistId` | PatientLayout | patient | Therapist details |
| `/patient/appointments` | PatientLayout | patient | Appointments |
| `/patient/pain-assessment` | PatientLayout | patient | Pain assessment |
| `/patient/profile` | PatientLayout | patient | Profile |
| `/patient/settings` | PatientLayout | patient | Settings |
| `/patient/messages` | PatientLayout | patient | Messages list |
| `/patient/messages/:conversationId` | PatientLayout | patient | Conversation |
| `/center` (index) | CenterLayout | `RequireRole ['center']` → `/center/login` | Redirect to `dashboard` |
| `/center/dashboard` | CenterLayout | center | Center dashboard |
| `/center/appointments` | CenterLayout | center | Appointments |
| `/center/patients` | CenterLayout | center | Patients |
| `/center/physiotherapists` | CenterLayout | center | Therapists |
| `/center/services` | CenterLayout | center | Services |
| `/center/reviews` | CenterLayout | center | Reviews |
| `/center/profile` | CenterLayout | center | Center profile |
| `/center/settings` | CenterLayout | center | Settings |
| `/center/physiotherapist` (index) | TherapistLayout | `RequireRole ['physiotherapist']` → `/center/login` | Redirect to `profile` |
| `/center/physiotherapist/profile` | TherapistLayout | physiotherapist | Therapist profile |
| `/center/physiotherapist/messages` | TherapistLayout | physiotherapist | Messages |
| `/center/physiotherapist/messages/:conversationId` | TherapistLayout | physiotherapist | Conversation |
| `/center/physiotherapist/settings` | TherapistLayout | physiotherapist | Settings |
| `/admin` (index) | AdminLayout | `RequireRole ['admin']` → `/admin/login` | Redirect to `dashboard` |
| `/admin/dashboard` | AdminLayout | admin | Admin dashboard |
| `/admin/centers` | AdminLayout | admin | Centers |
| `/admin/centers/:id` | AdminLayout | admin | Center detail |
| `/admin/patients` | AdminLayout | admin | Patients |
| `/admin/physiotherapists` | AdminLayout | admin | Physiotherapists |
| `/admin/appointments` | AdminLayout | admin | Appointments |
| `/admin/reviews` | AdminLayout | admin | Reviews |
| `/admin/activity` | AdminLayout | admin | Activity |
| `/admin/settings` | AdminLayout | admin | Settings |

Note: the therapist portal lives under `/center/physiotherapist/*` but has its **own** role guard and
layout. There is no `/therapist/*` prefix.

### 4.2 Guard behaviour (`RequireRole`)

```text
status === 'loading'            → localized loading text
error                           → alert + “Retry” button (restoreSession({ force: true }))
no session                      → <Navigate to={loginPath} replace />
session.role not in roles       → <Navigate to={getAuthenticatedDestination(role)} replace />
otherwise                       → <Outlet />
```

`getAuthenticatedDestination`:

| Session role | Destination |
| --- | --- |
| `patient` | `/patient/dashboard` |
| `center` | `/center/dashboard` |
| `physiotherapist` | `/center/physiotherapist` |
| `admin` | `/admin/dashboard` |

Consequences:

- A signed-in patient opening `/center/dashboard` is redirected to `/patient/dashboard`, not shown a
  403.
- A therapist opening `/center/dashboard` is redirected to their own portal.
- An unknown role throws `AuthServiceError('unsupportedRole')`.

### 4.3 Role naming

| Backend role (`Users.Role`) | Frontend `session.role` |
| --- | --- |
| `Patient` | `patient` |
| `Center` | `center` |
| `Therapist` | `physiotherapist` |
| `Admin` | `admin` |

The mapping happens in `services/api/mappers.js` (`toSession`) and the mock auth adapter.

---

## 5. Layouts and navigation

### 5.1 PublicLayout

- Skip link (`#public-content`) for keyboard users.
- `PublicHeader` in compact mode except on `/`.
- Footer only on `/`.
- Sets `document.title` per route group and language.
- Renders Geoapify/OpenStreetMap attribution on `/center/signup`.
- Hosts all auth screens through `AuthShell` (split hero/form layout).

### 5.2 CenterLayout — one shell, three portals

`CenterLayout({ portal })` is the app shell for `center`, `patient` and `physiotherapist`.

Common shell:

- `Navbar` with search, language switcher, theme toggle, quick settings, notifications bell and profile
  menu.
- `Sidebar` with role-specific navigation and a messages badge (sum of unread counts).
- Page title from the active nav item.
- `Footer`.
- Scroll-to-top on navigation.
- Session-aware identity (logo/image/name).
- `signOut()` then navigate to `/`.

Data and realtime:

- Loads the role workspace through the CRUD layer (`getCenterWorkspace` or `getMessagingWorkspace`) and
  exposes it to pages through `useOutletContext()` (`useCenter()`).
- Polls every **20 seconds** as a fallback.
- Subscribes to `workspaceChanged` over SignalR; one event schedules one refresh (debounced), replacing
  the need to wait for the poll.
- Refreshes on window focus.
- Maps notification types to preference keys before rendering the bell; marking read calls
  `markNotificationsRead`.
- The local pain-assessment route (`/patient/pain-assessment`) is deliberately usable even when
  messaging/workspace calls fail (assessment is local-first).
- `ConfirmDialog` and `Feedback` from `CenterUI` provide blocking confirmation and inline status.

Navigation per portal:

| Portal | Items (path suffix) |
| --- | --- |
| Center | `dashboard`, `appointments`, `patients`, `physiotherapists`, `services`, `reviews`, `profile`, `settings` |
| Patient | `dashboard`, `centers`, `pain-assessment`, `appointments`, `messages`, `profile`, `settings` |
| Therapist | `messages`, `profile`, `settings` |

`PatientLayout` and `TherapistLayout` are two-line wrappers around `CenterLayout` with the portal prop,
so all three share polling, realtime, bell and shell behaviour.

### 5.3 AdminLayout

- `Navbar` + `Sidebar` + `AdminLayout`-specific search (global search over centers/patients/therapists/
  appointments, navigating to the matching row).
- Navigation: `dashboard`, `centers`, `patients`, `physiotherapists`, `appointments`, `reviews`,
  `activity`, `settings`.
- Bell loads `getAdminNotifications` and uses a separate preference map
  (`centerApproval → approvalRequests`, `appointmentCancelled → appointmentUpdates`,
  `reviewReported → reportedReviews`, `therapistVerified → approvalRequests`).
- Identity (name/image) comes from admin settings, so editing the profile updates the shell without a
  reload.
- No dedicated notifications page: the bell is the notifications surface, same as other roles.

### 5.4 AuthShell

`components/auth/AuthShell.jsx` provides the two-column auth layout (brand/illustration + form card),
language/theme controls, and a back link. `AuthForm` renders fields, errors and submit state;
`AccountDestination` shows the post-login destination/role hint.

---

## 6. Styling, theme and internationalisation

### 6.1 CSS architecture

- `styles/variables.css` defines colours, spacing, radii, shadows and typography tokens for both themes.
- `styles/light.css` / `styles/dark.css` bind those tokens to `[data-theme]` selectors.
- `styles/global.css` resets, base typography, focus rings, scrollbars and shared utility classes.
- `styles/responsive.css` holds breakpoints (sidebar collapse, grids, tables) but is currently not
  imported; responsive behaviour therefore comes from Bootstrap plus each feature stylesheet's own
  media queries.
- Feature CSS lives next to its component (`CenterUI.css`, `PatientDiscovery.css`, `AdminUI.css` +
  `ListPages.css`, etc.). Bootstrap is used for layout primitives (grid, modal, dropdown,
  offcanvas) but the visual identity is custom.

### 6.2 Theme

`ThemeContext`:

- Reads the stored theme, otherwise the `prefers-color-scheme` media query.
- Applies `data-theme="light|dark"` to `<html>`.
- Persists the explicit choice.
- `ThemeToggle` appears in every shell and the public header.

### 6.3 Language and RTL

`LanguageContext`:

- Two languages: `en` (LTR) and `ar` (RTL).
- Sets `<html lang dir>` and persists the choice.
- `t(key, vars)` wraps i18next; interpolation is used for counts/names.
- `localized(value, language)` in `utils/centerFormat.js` picks `nameAr`/`name` style pairs.
- Arabic strings live in `locales/ar.js`; assessment copy in `locales/painAssessment.js`; patient
  refinements in `locales/patientRefinements.js`.
- Numbers, dates and currency are formatted with `Intl` where the page needs it; the app does not
  maintain separate Arabic numeral formatting.

### 6.4 Layout behaviour

- Public pages: centered content, max-width containers, sticky compact header after the landing page.
- Portals: fixed sidebar on desktop, offcanvas sidebar on mobile, sticky navbar, scrollable main.
- Tables become card lists on narrow screens (`responsive.css` + per-page CSS).
- Modals are React Bootstrap modals with focus trapping; custom `Modal` is used for simpler dialogs.

---

## 7. Data layer

The frontend has three layers under `services/`:

```text
pages/components
      │  hooks (useDiscovery, usePatientAccount, useCenter, useAdminQuery, …)
      ▼
services/crud/*           page-facing functions, mock-or-API routing, subscriptions
      ▼
services/api/* or services/mock/*   transport + payload mapping, or browser storage
```

### 7.1 Data mode (`services/runtime.js`)

```js
export const mockEnabled = (import.meta.env.VITE_DATA_MODE ?? 'mock') === 'mock';
export const httpClient = createHttpClient({ baseUrl: VITE_API_BASE_URL || '', ...transportOptions });
```

- **mock** (default): CRUD services read/write browser storage seeds; no network required.
- **api**: CRUD services call the operation contract over `httpClient`.
- API mode never silently falls back to mock for a failed operation.
- `authService` is a partial exception: the patient adapter prefers the live API whenever
  `VITE_API_BASE_URL` is set (even in mock mode), while center/therapist/admin follow the data mode.
  This supports “demo center data + real patient accounts”.

### 7.2 Transport (`api/gateway.js`, `api/httpClient.js`)

`createGateway({ baseUrl, fetcher, getHeaders, credentials, timeoutMs = 15000 })`:

- Joins `baseUrl` + path and refuses a path that escapes the API origin.
- Adds `Authorization: Bearer <stored access token>` and JSON/multipart headers.
- Serialises query strings; encodes bodies; supports `FormData`.
- Aborts after 15 s (`AbortError` → `cancelled`).
- Maps HTTP status to UI codes: 400 `validation`, 401 `unauthenticated`, 403 `forbidden`,
  404 `notFound`, 409 `conflict`, 413 `image`, 415/422 `validation`, 429 `rateLimited`.
- Parses the API error envelope `{ code, message, errors }` into `ServiceError(code, { status, fields })`
  using `validationFields.mapFieldErrors`.
- **401 + `token_expired`** triggers exactly **one** refresh:
  `POST /api/Auth/refresh` with the stored refresh token; on success it saves the rotated tokens and
  retries the original request once; on failure it clears the session and throws. Concurrent 401s share
  a single in-flight refresh promise.

`httpClient` merely exposes `send/get/post/put/patch/delete` over the gateway.

### 7.3 Operation contract (`api/backendContract.js`)

One object per operation:

```js
operationName: {
  request: (values, actor) => ({ method, path, data? }),
  response: (body, actor) => uiModel,
  error?: (error) => ServiceError,
}
```

- Paths are centralised here; no page knows a URL.
- Requests receive the current actor, so role-dependent paths are possible
  (e.g. therapist vs center image endpoint, preferences endpoint).
- Responses are mapped through `api/mappers.js`.
- `/uploads/...` strings are rewritten to absolute API URLs recursively (`resolveAssets`), so images and
  attachments work when the SPA and API are on different origins.
- Unsupported operations are explicit: `saveAppointment` is registered as `notImplemented` and throws
  `ServiceError('unavailable')` instead of pretending to succeed.

`transportOptions = {}` is passed to the gateway (no cookies, default timeout).

Constants: `AUTH=/api/Auth`, `PATIENT=/api/patient`, `CENTER_WORKSPACE=/api/center/workspace`,
`THERAPIST_WORKSPACE=/api/therapist/workspace`, `SCHEDULES=/api/Schedules`, `ADMIN=/api/admin`.

### 7.4 Adapters

- `api/operationAdapter.js` — turns the operation map into `{ mode: 'api', execute(name, request) }`,
  resolving the request, calling the gateway, mapping the response and normalising errors.
- `services/auth/apiAuthAdapter.js` — restores/saves/clears the real session; refreshes on restore when
  needed; exposes `execute` for auth operations.
- `services/auth/mockAuthAdapter.js` — demo accounts, registrations, centre activation, session
  restoration, therapist identity resolution from mock repositories.
- `services/authService.js` — the public auth façade and store:
  - `loginPatient`, `loginCenter`, `loginAdmin`, `registerPatient`, `registerCenter`,
    `loginWithGoogle`, `restoreSession`, `logout`, `getAuthenticatedDestination`,
    `listCenterApplications`, `getCenterApplication`, `approveCenterApplication`,
    `rejectCenterApplication`.
  - `publish(session)` notifies subscribers; `restoreSession` de-duplicates concurrent restores.
  - `logout()` clears **every** adapter and returns `/`.
  - In mock mode it listens to `focus` and `storage` to restore cross-tab changes.
  - `authMode` is `api`, `demo` or `unavailable`; `isAuthDemo` is exported for UI hints.

### 7.5 Session storage (`services/auth/session.js`)

- Key `physioguide-session`.
- Stored shape: `{ token, refreshToken, session, authenticatedAt }`.
- Contains the mapped session (`userId`, `patientId`, `centerId`, `therapistId`, `fullName`, `email`,
  `role`) — never a password.
- All operations are wrapped in `try/catch`, so private mode degrades to in-memory only for the current
  render.
- Mock sessions use a separate key (`physioguide.mock.session.v1`).

### 7.6 CRUD services

These are the functions pages actually import.

| Service | Exports (summary) | Used by |
| --- | --- | --- |
| `adminService.js` | `callAdmin(method, ...args)` dispatcher (mock vs API) plus the admin operation surface used by pages: dashboard, activity, centers, patients, physiotherapists, appointments/options, reviews/moderation, settings, image, notifications, password | Admin pages |
| `appointmentService.js` | `saveCenterAppointment`, `updateAppointmentStatus`, `requestPatientAppointment` | Center appointments, BookingModal |
| `centerPortalService.js` | `subscribeCenter`, `callCenter(method, ...args)` — the **generic dispatcher** used by every portal, `getCenterWorkspace`, `prepareCenterImage`; performs session/actor verification and the per-role allow-list check | CenterLayout, center/patient/therapist pages, schedule form |
| `centerRemainingService.js` | `saveCenterPreferences` (re-export), `updateCenterImages`, `saveCenterInformation`, `replyToCenterReview`, `changeCenterPassword`, `getReviewStatistics` | Center profile/settings/reviews |
| `messageService.js` | `getMessagingWorkspace`, `markConversationRead`, `sendMessage`, `downloadMessageAttachment` | Messaging screens + shell badge |
| `notificationService.js` | `markNotificationsRead`, `markCenterNotificationsRead`, `saveCenterNotificationPreferences` | Shells, preferences |
| `patientAccountService.js` | `getPatientAccount`, `savePatientProfile`, `preparePatientImage`, `savePatientPreferences`, `changePatientPassword`, `subscribePatientAccount` | Patient profile/settings |
| `patientAssessmentService.js` | `submitAssessment`, `getAssessmentHistory`, `getAssessment` | Pain assessment |
| `patientDiscoveryService.js` | `getPatientDiscovery`, `getPatientSavedCenters`, `createPatientReview`, `setPatientFavorite`, `getPatientSlots`, `getPatientAppointments`, `openPatientConversation`, `subscribePatientDiscovery` | Patient dashboard/discovery/details/appointments |
| `patientService.js` | `saveCenterPatient`, `addPatientNote` | Center patients |
| `serviceService.js` | `saveCenterService` | Center services |
| `therapistService.js` | `saveCenterTherapist`, `saveOwnTherapistProfile`, `prepareTherapistImage` | Center therapists, therapist profile |

`callCenter` is the most important function in the layer. It:

1. restores the session (forcing a restore in mock mode) and rejects a missing/mismatched actor;
2. calls `authorizeCenterOperation(session, method)` against the role allow-list in
   `services/center/access.js` — a method not listed for the role throws `forbidden` **before** any
   transport call;
3. replaces the claimed actor argument with the freshly restored session, so a tampered context cannot
   impersonate another id;
4. for `patient` actors, dispatches to `mockPatientOperations` (mock) or the API adapter (api);
5. otherwise uses a per-center mock adapter or the shared API adapter;
6. emits a change event after writes so subscribed pages refresh.

Subscription helpers (`subscribe*`) let mock mode notify same-tab and cross-tab listeners; API mode
returns a no-op unsubscribe because the shell polls/SignalR refreshes instead.

### 7.7 API mappers (`api/mappers.js`)

`to*` functions normalise both backend spellings and mock shapes:

- `toSession` (role mapping, ids as strings, display names),
- `toCenter` / `toCenterSummary` (bilingual names, images, rating, distance, services, therapists),
- `toAppointment` (status → UI status, `startDateTime`/`datetime` compatibility, price, review flag),
- `toTherapist`, `toService`, `toPatient`, `toReview`, `toNotification`, `toMessage`,
  `toConversation`, `toAssessment`, `toAdminRow` variants.

They are deliberately tolerant: missing optional fields become `null`/`[]`, numeric and string ids are
accepted, and unknown statuses fall back to a safe label. This is why the UI can render seeded,
mocked and live payloads with the same components.

### 7.8 Mock layer

- `mock/browserStore.js` — namespaced `localStorage` wrapper with JSON serialisation, defaults and change
  events. Keys are versioned, e.g. `physioguide.mock.center.v1:{id}`.
- `mock/centerRepository.js` — mock centers, activation/pending state, therapists, seed data.
- `mock/accountRepository.js` — registered demo accounts and session identity.
- `mock/adminData.js` — admin rows, activity, reviews, settings derived from the center/account stores.
- `patient/mockPatientAccount.js`, `patient/mockPatientOperations.js` — patient account, favourites,
  appointments, reviews and assessment persistence.
- `center/mockCenterAdapter.js` — center operations over the repository.
- `data/centerPortal.js` — center-portal seed fixtures.
- The nine empty files under `src/data/` are placeholders kept from the original scaffold; no page
  imports them.

### 7.9 Realtime (`services/messagingRealtime.js`)

- Resolves the hub URL: `VITE_SIGNALR_HUB_URL` → `${VITE_API_BASE_URL}/hubs/messages`.
- Builds the connection with `accessTokenFactory` returning the stored access token.
- Starts once per shell, subscribes to `workspaceChanged`, reconnects with backoff, and stops on logout
  or unmount.
- Returns a stop function; mock mode does not connect.
- The event is treated as a hint: the shell refetches the workspace/notification list.

### 7.10 Specialised services

| Service | Purpose |
| --- | --- |
| `centerLocationService.js` | Address search + reverse geocoding. Geoapify when `VITE_GEOAPIFY_API_KEY` exists, otherwise Nominatim, with OpenStreetMap tiles for the map. Handles rate limits/abort and returns `{ label, latitude, longitude }`. |
| `auth/centerLocation.js` | Registration-time variant that derives a city from the chosen address and validates coordinates. |
| `patient/specialtyMatching.js` | Maps selected symptoms/regions to a suggested specialty for discovery filters. |
| `patient/painAssessmentModel.js` | Question definitions, answer validation, scoring, suggested specialty and care copy; also exports `toAssessmentResult` used by the API mapper. |
| `patient/notificationPolicy.js` | Maps notification types to preference keys; creates mock appointment-update alerts and 24-hour reminders; suppresses muted types without resurrecting old events. |
| `centerSummaryService.js` | Derives center dashboard counters/series from the workspace. |
| `patientSummaryService.js` | Derives `getPatientAppointmentSummary` for the center-side `PatientDetails` drawer (visit counts/last visit). |
| `utils/centerFormat.js` | `localized`, currency/date/time formatting, distance, initials. |
| `utils/authValidation.js` | Login/registration field validation shared by auth pages. |
| `utils/imageFile.js` | Client-side image fitting/compression before upload (`fitImageFile`), keeping under the 2 MB server limit. |
| `utils/personImage.js` | Avatar fallback (initials/colour) for patients/therapists. |
| `utils/messageFormat.js` | Message grouping, timestamps, attachment naming. |

---

## 8. Screens and use cases

Every page below is reachable only through the routes in §4. “Data” names the service/hook the page
uses; “states” lists what the user sees when things are empty, loading or failing.

### 8.1 Public and authentication

#### Landing page — `/`

- Public header with logo, language switcher, theme toggle, “Sign in” and “Get started”.
- Hero with the physiotherapy image, headline, supporting copy, primary CTA to `/choose-role` and an
  “about” anchor.
- About section with the “how it works” list and a link to sign in.
- Service-category grid (icon, title, description per service key).
- Footer only on this route.
- All copy is translated; the layout flips for Arabic.

#### Role selection — `/choose-role`

| Use case | Behaviour |
| --- | --- |
| Choose patient | Card links to `/patient/login` and `/patient/signup` |
| Choose center | Card links to `/center/login` and `/center/signup`; note that therapists sign in here too |
| Go back | Header/back link to `/` |

Admin login is deliberately not advertised; it is reachable at `/admin/login`.

#### Authentication — `/patient/login`, `/patient/signup`, `/center/login`, `/center/signup`, `/admin/login`

All five routes render **the same** `components/auth/AuthForm.jsx` with `role` and `mode` props:

```jsx
<AuthForm role='patient' mode='login' />
```

That single 1,000-line component owns every auth use case:

| # | Use case | Details |
| --- | --- | --- |
| AU1 | Patient login | Email + password; submits `loginPatient`; redirects to `/patient/dashboard` |
| AU2 | Patient registration | Name, email, phone, password + confirmation, optional gender; submits `registerPatient`; shows success + “return to login” |
| AU3 | Center login | Email + password; submits `loginCenter`; also used by therapists (role `physiotherapist` destination) |
| AU4 | Center registration | Center name, email, phone, password + confirmation, location; geocodes and confirms coordinates; submits `registerCenter`; shows “pending approval” guidance |
| AU5 | Admin login | Email + password; submits `loginAdmin`; redirects to `/admin/dashboard` |
| AU6 | Password visibility | `FormField` toggle on both password fields |
| AU7 | Inline validation | `validateAuthForm`: required fields, email shape, phone shape, password length (8), confirmation match; errors translated per field and focus moves to the first invalid field |
| AU8 | Server field errors | API `errors` are mapped onto fields (`Email`, `Reason`, etc.); unknown field names are ignored |
| AU9 | Account-state messages | `accountPending`, `accountRejected`, `accountSuspended`, `centerNotApproved`, `accountUnavailable` each get their own translated message |
| AU10 | Generic failures | `invalidCredentials`, `network`, `timeout`, `rateLimited`, `validation`, `unavailable`, `unexpected` |
| AU11 | Double-submit guard | A ref blocks concurrent submits; only the latest request may clear the pending state |
| AU12 | Pending state | Submit button shows a loading state and “submitting” status text; inputs disabled |
| AU13 | Notice hand-off | A `location.state.notice` (for example after registration) is shown as an info message |
| AU14 | Already signed in | The guard on portal routes redirects away; the auth pages themselves do not auto-redirect |

Location picker (center signup):

- “Find my location” uses the browser geolocation, then reverse-geocodes to an address.
- Typing an address and searching calls `searchCenterAddress` (Geoapify with a key, otherwise Nominatim).
- Results open a confirmation modal; choosing one sets the address and the coordinates and marks the
  location confirmed.
- Aborts previous lookups, ignores stale responses, and translates failures (`denied`, `timeout`,
  `unsupported`, `lookupUnavailable`, `noAddressResults`, …).
- The city sent to the backend is derived from the address by `cityFromAddress` (second-to-last
  comma-separated component, else the first).

Google sign-in:

- Only offered for patient/center, and only when `authMode === 'api'`; in demo mode a disabled Google
  button explains that it is unavailable.
- `googleAuth.js` loads Google Identity Services, requests a nonce challenge bound to a freshly
  generated 32-byte verifier, renders the GIS button, and sends the ID token through
  `signInWithGoogle`.
- Existing account → session published → redirect.
- New identity → the form switches to the “complete your profile” step, which collects the role's
  remaining fields (name + gender for patients; center name + location for centers; phone in both) and
  submits the registration ticket, then signs in.
- Flow-reset errors restart the challenge; conflicts (email already used) show `googleConflict`.
- The verified Google email is displayed read-only; the backend ignores any email field in this step.

#### Error pages

| Route | Screen | Content |
| --- | --- | --- |
| `/404` and any unknown path | `NotFoundPage` | Localized title/description, link home |
| `/403` | `UnauthorizedPage` | Permission guidance, link home |
| `/500` | `ServerErrorPage` | Apology + retry/home |
| `/offline` | `OfflinePage` | Connection guidance |
| `/maintenance` | `MaintenancePage` | Maintenance notice |

They render inside `PublicLayout`, so the public header remains available.

### 8.2 Patient portal

All patient screens live under `PatientLayout`, so they share the shell, bell, polling, realtime and
messages badge. Data flows through `useDiscovery`, `usePatientAccount` or `useOutletContext`.

#### Dashboard — `/patient/dashboard`

| # | Use case | Details |
| --- | --- | --- |
| PD1 | Welcome header | Greets the patient by name and shows the intro copy |
| PD2 | Hero CTA | Rehabilitation image + “appointments” button → `/patient/appointments` |
| PD3 | Recommended centers | Top three centers by rating, rendered as `CenterCard` with favourite/book actions |
| PD4 | Recommended services | Four service links from the discovery payload; each opens the center page on its services tab with the service preselected |
| PD5 | Book from a card | Opens `BookingModal` without leaving the dashboard |
| PD6 | View all | “View all” → `/patient/centers` |
| PD7 | States | `DiscoveryState` handles loading, error/retry and empty discovery |

The dashboard does **not** show appointment counters, a next-appointment card or an assessment prompt;
those live on the appointments/assessment screens.

#### Find centers — `/patient/centers`

| # | Use case | Details |
| --- | --- | --- |
| PF1 | Text search | Matches center name, city, address or service names |
| PF2 | Filters | Specialty (real specialties plus assessment care categories), minimum rating (`3+`, `4+`, `4.5+`), maximum price (≤50/100/200), saved-only toggle; clear-all |
| PF3 | Sort | Rating (default), lowest price, name |
| PF4 | Specialty matching | `specialtyMatching` normalises labels and matches a center by services/therapists, including care categories from the assessment |
| PF5 | Favorite/unfavorite | Optimistic heart, persisted through `setPatientFavorite` |
| PF6 | Open center | Navigates to `/patient/centers/:centerId` |
| PF7 | URL state + paging | Filters/sort live in `?q=&specialty=&rating=&price=&sort=&saved=` and the list is paginated with `usePagination` + `Pagination` |
| PF8 | States | Loading skeletons, empty result message, error retry, focus refresh |

#### Center details — `/patient/centers/:centerId`

| # | Use case | Details |
| --- | --- | --- |
| PC1 | Hero and gallery | Cover image, `CenterGallery` lightbox |
| PC2 | About and contact | Description, address, phone, website, directions link |
| PC3 | Working hours | Per-day schedule with closed state |
| PC4 | Services | Name, description, duration, price; “Book” preselects the service |
| PC5 | Therapists | Cards → `/patient/centers/:centerId/therapists/:therapistId` |
| PC6 | Reviews | `ReviewsCarousel`, rating distribution, “write a review” when eligible |
| PC7 | Map | `ClinicMap` with the center pin and “open in maps” |
| PC8 | Booking | `BookingModal`: service → therapist → date → time → notes → submit |
| PC9 | Favorite | Heart in the header |
| PC10 | Review modal | `ReviewModal` (rating + comment) only when a completed unreviewed visit exists |
| PC11 | States | Missing center → not-found panel; slots empty → “no times” guidance |

Booking details (`BookingModal` + `usePatientAvailability`):

- Therapists are filtered to those who provide the chosen service.
- Dates come from `AppointmentDates`: a horizontally paged rail (5–55 visible depending on width) with
  previous/next page buttons and a native date picker; past days are not offered.
- `TimeRail` shows slots from `getPatientSlots`; changing service/therapist/date refetches.
- Client-side validation requires service, therapist, date and time; a double-submit ref prevents
  duplicates.
- Success closes the modal and navigates to `/patient/appointments` with a confirmation notice.
- `slot_unavailable` is shown as a specific message and the slots are refreshed.

#### Therapist details — `/patient/centers/:centerId/therapists/:therapistId`

- Profile (image, name EN/AR, specialty, experience, languages, qualifications, bio EN/AR).
- Services performed and their prices/durations.
- Availability windows (read-only) and a “Book with this therapist” action.
- Reviews for the center and a link back to the center.
- 404-safe: an unknown therapist id renders an empty state rather than crashing.

#### Appointments — `/patient/appointments`

| # | Use case | Details |
| --- | --- | --- |
| PA1 | Tabs | `upcoming`, `completed`, `cancelled`, each with a count (`appointmentCounts`) |
| PA2 | Grouping | Status-driven, not clock-driven: an overdue pending request stays in upcoming |
| PA3 | Card details | Center, therapist, service, date/time, price, status badge |
| PA4 | Details modal | Full appointment information and notes |
| PA5 | Review | Button on completed, unreviewed appointments → `ReviewModal` |
| PA6 | Book again | Opens the center page/booking flow |
| PA7 | Empty states | Per-tab copy explaining what will appear |
| PA8 | No cancel/reschedule | The patient UI intentionally has no cancel/reschedule action; the patient contacts the center |

#### Profile — `/patient/profile`

- Read mode: avatar, name, email, phone, gender, date of birth, city, member-since.
- Edit mode (`ProfileEditor`): name, phone, gender, date of birth, city; avatar upload with preview.
- `profileErrors` validates: name required and ≤100 characters client-side (the API allows 150), phone
7–15 digits with allowed symbols, city ≤100,
  gender in `male|female|other`, date of birth a real past date, image URL/data-URL shape.
- Upload uses `fitImageFile` to resize/compress before sending; server still enforces 2 MB.
- Save calls `savePatientProfile`; success returns to read mode with a confirmation; failures map field
  errors.
- Unsaved-changes guard warns before navigating away.

#### Settings — `/patient/settings`

| # | Use case | Details |
| --- | --- | --- |
| PS1 | Notification preferences | Appointment updates, reminders, new messages (mapped to `emailEnabled`/`inAppEnabled`/`appointmentReminders`/`marketing`) |
| PS2 | Language | `en`/`ar` preference persisted with the account |
| PS3 | Password change | Current + new + confirmation; calls `changePatientPassword`; revokes other sessions |
| PS4 | Account information | Read-only email and ids |
| PS5 | Theme/language shortcuts | Immediate UI change through the global providers |
| PS6 | Errors | Wrong current password → field error; weak password → length error; rate limit message |

#### Pain assessment — `/patient/pain-assessment`

| # | Use case | Details |
| --- | --- | --- |
| PP1 | Intro | Explains the assessment and that it is not a diagnosis |
| PP2 | Body map | Front/back silhouette (`BodyMap`, `bodyHotspots`) with selectable regions |
| PP3 | Questions | Five steps (pain regions, onset, severity, pattern, red flags), progress indicator |
| PP4 | Validation | Every question required; “other” needs text; numeric severity in range |
| PP5 | Submit | `submitAssessment`; result shows suggested specialty + care guidance |
| PP6 | Care precedence | Professional review > general guidance > post-surgical > persistent pain > regional advice |
| PP7 | History | Previous assessments with date/specialty; open one for details |
| PP8 | Local fallback | The assessment model can compute locally when the API is unavailable, so the page still works offline |
| PP9 | Navigation guard | Leaving mid-assessment asks for confirmation |

### 8.3 Center portal

Center pages read the workspace from `useCenter()` (the `CenterLayout` outlet context) and call the CRUD
dispatcher for writes. After a write, the shell refreshes (event or poll).

#### Dashboard — `/center/dashboard`

- Four KPI cards: today's appointments, patient count, upcoming appointments, average rating
  (`centerSummaryService.getDashboardSummary`).
- Today's schedule (first three + “view all”) with patient avatar/name and status.
- Quick-action links (for example add patient).
- Upcoming appointments grouped by the next two dates with per-day counts.
- Empty states for a brand-new center.

#### Appointments — `/center/appointments`

| # | Use case | Details |
| --- | --- | --- |
| CA1 | Filter | Status tabs `all/pending/confirmed/completed/cancelled` with counts (`appointmentStatuses`) |
| CA2 | Toolbar | Patient search, month picker, therapist/service selects, date sort (asc/desc); a mobile filter modal mirrors the selects and shows an active-filter count |
| CA3 | Row details | `AppointmentDetails` panel/modal with patient, service, price, notes |
| CA4 | Actions | `appointmentActions`: pending → confirm/edit/cancel; confirmed → edit/complete/cancel |
| CA5 | Confirm | Status `approved`; notifies patient/therapist |
| CA6 | Reject/cancel | `RecordForm` collects an optional reason; status `rejected`/`cancelled` |
| CA7 | Complete | Status `completed`; unlocks the patient review |
| CA8 | Edit | Opens the record form for status/reason only — the live contract has no reschedule endpoint (`saveAppointment` is unimplemented) |
| CA9 | Overlap guard | `overlapsBooking` prevents creating/confirming a slot that overlaps another appointment for the same therapist or patient in mock flows |
| CA10 | States | Empty tab copy, error banner, busy button per row |

#### Patients — `/center/patients`

| # | Use case | Details |
| --- | --- | --- |
| CP1 | List/search | Linked patients with visit counts and last visit |
| CP2 | Details | `PatientDetails` drawer: demographics, appointments, notes |
| CP3 | Add patient | `RecordForm` creates a login account + profile + center link (name, email, phone, password, gender, DOB, city, image, active) |
| CP4 | Edit patient | Same fields without password; email uniqueness enforced |
| CP5 | Activate/deactivate | `isActive` blocks the patient's login |
| CP6 | Add note | Private note (≤2000) with author and timestamp |
| CP7 | Empty/error | No patients → invitation to add one; permission errors surfaced |

#### Physiotherapists — `/center/physiotherapists`

| # | Use case | Details |
| --- | --- | --- |
| CT1 | List | Name, specialty, availability, service count, experience |
| CT2 | Add therapist | Login account + profile + services (see §8.3 add flow) |
| CT3 | Edit therapist | Name/bio (EN/AR), specialty, services, experience, qualifications, languages, availability, active |
| CT4 | Schedule | `TherapistScheduleForm`: weekly windows, add/edit/delete, overlap + center-hours validation |
| CT5 | Search/filter | By name/specialty/availability |
| CT6 | Errors | Duplicate email, service not owned by the center, schedule outside hours, orphaning a booking |

#### Services — `/center/services`

- Cards/table with bilingual name, specialty, price, duration, active state.
- Add/edit service (`saveCenterService`): both names required, price 0–1,000,000, duration 5–600,
  specialty required, optional image, active toggle.
- Deactivate instead of delete (there is no delete-service endpoint).
- Empty state prompts the first service.

#### Reviews — `/center/reviews`

- Rating summary and distribution (`getReviewStatistics`).
- List with patient, rating, comment, date, visibility and reply.
- Reply composer per review (`replyToCenterReview`), ≤1000, overwrites a previous reply.
- Hidden reviews are shown with a badge (moderated by admin).
- Empty and error states.

#### Center profile — `/center/profile`

- Read/edit center identity: names (EN/AR), descriptions, city, address (EN/AR), phone, email, website,
  profile image.
- `ClinicLocationEditor` + `ClinicMap`: search/geolocate, drag pin, confirm; coordinates are required to
  be a valid pair with confirmation before saving.
- Working hours editor (week window + Friday window).
- Gallery manager: upload (2 MB), set primary, delete by id/URL.
- Unsaved-changes guard.

#### Settings — `/center/settings`

- Notification preferences (same four flags + language).
- Password change (current + new + confirmation).
- Account/session information.
- No “delete center” action; only an admin can remove a center.

### 8.4 Therapist portal

#### Profile — `/center/physiotherapist/profile`

- Read: image, name EN/AR, specialty, center, phone, experience, qualifications, languages, bio EN/AR,
  availability.
- Edit: descriptive fields only (`saveOwnTherapistProfile`); center/specialty/services are read-only.
- Avatar upload through the therapist workspace image endpoint.
- Discard-changes confirmation; validation on name/experience.

#### Messages — `/center/physiotherapist/messages`

- Conversation list (`ConversationList`) with patient avatar, last message, time, unread badge.
- Search by patient name; empty state when no patient has messaged yet.
- Selecting a conversation opens `/center/physiotherapist/messages/:conversationId`.
- Refreshes via workspace polling/SignalR.

#### Conversation — `/center/physiotherapist/messages/:conversationId`

| # | Use case | Details |
| --- | --- | --- |
| TC1 | Load thread | `getMessagingWorkspace` / `messageService`; only participant conversations |
| TC2 | Read receipts | Opening marks messages read (`markConversationRead`) |
| TC3 | Send text | ≤2000 characters; optimistic bubble then refresh |
| TC4 | Send attachment | Upload to the therapist workspace, then send the URL; image preview |
| TC5 | Attachment download | `downloadMessageAttachment` handles auth and filename |
| TC6 | Scroll behaviour | Auto-scroll to newest; “new messages” affordance when scrolled up |
| TC7 | Errors | Empty message blocked; network failure restores the draft |
| TC8 | Not found | Unknown/foreign conversation → empty state, not a crash |

The patient portal reuses the same two screens at `/patient/messages*`; the shell passes the patient actor
and the API scopes the data.

#### Settings — `/center/physiotherapist/settings`

- Notification preferences, password change, language, session info.
- No schedule editing (center-owned).

### 8.5 Admin portal

Admin pages call `callAdmin(method, …)`, which resolves the admin session, enforces the admin role, then
uses the API or mock adapter. Lists support search, filters and pagination via `useAdminQuery`.

#### Dashboard — `/admin/dashboard`

- Metric cards for centers, patients and therapists, each with a value, change indicator and mini bar
  series.
- “Appointment overview” panel: a monthly bookings chart for the selected year (current or previous).
- “Platform health” panel with appointment/review status breakdowns and percentages.
- “Recent activity” list with a link to `/admin/activity`.
- No revenue figure and no approval shortcut on this page; approvals live under `/admin/centers`.

#### Centers — `/admin/centers`

| # | Use case | Details |
| --- | --- | --- |
| AC1 | List | Debounced search plus status, specialty and city filters, page-size 10 and pagination |
| AC2 | Approve | `setCenterStatus approved`; requires no reason |
| AC3 | Reject | Reason required; shown to the owner on login |
| AC4 | Suspend | Blocks owner/therapist login, keeps data |
| AC5 | Reopen as pending | Allowed by the API |
| AC6 | View detail | Navigation to `/admin/centers/:id` |
| AC7 | Edit | Names, city, address, website, phone, description |
| AC8 | Delete | Confirmation; blocked with `center_has_therapists` and the therapist list |
| AC9 | Row actions | Shared `ActionsMenu` with `portal` + `compact`: view/edit/status/delete |
| AC10 | Empty/error | No centers, failed load, permission denied |

#### Center detail — `/admin/centers/:id`

- Header with status, average rating, contact and quick actions.
- Sections: identity/location, photos, documents, therapists, services, specialties, and appointment/
  review statistics.
- Edit/status/delete from this page; back to the list.
- Unknown id → not-found panel.

#### Patients — `/admin/patients`

- Filters: search, status (active/suspended), city, sort (default vs `recent` activity); gender is shown
  in the row, not used as a filter.
- Table: patient, age, city, appointment count, last visit, status.
- View dialog (`AdminViewDialogs`): profile, appointments, assessments, reviews, notes.
- Edit dialog (`AdminRecordDialogs`): name, phone, city, gender, DOB.
- Suspend/reactivate; delete with a destructive confirmation explaining the cascade.
- Pagination and empty states.

#### Physiotherapists — `/admin/physiotherapists`

- Filters: search, center, specialty, active.
- Table: name, center, specialty, experience, availability, status.
- Create dialog: account + centre + specialty + profile fields.
- Edit: name, phone, center, specialty, years, bio, availability.
- Suspend/reactivate (updates `IsActive` on both rows).
- Delete with cascade confirmation.

#### Appointments — `/admin/appointments`

- Filters: free-text search, status, center, date; page-size 10 and pagination.
- Table: patient, center, therapist, service, start/end, price, status (no therapist/patient filter in
  the toolbar; those exist only in the create/edit dialog).
- Create dialog: patient, center, therapist, service, start/end, notes; auto-confirmed.
- Edit dialog: change center/therapist/service/times/status/notes (price resnapshotted on service change).
- Delete with confirmation.
- Linked appointment from activity opens the filtered row.

#### Reviews — `/admin/reviews`

- Filters: search, rating, status/visibility, sort, plus a single `reviewId` from an activity deep link
  (`?review=`); page-size 10 and pagination. There is no center filter in the toolbar.
- Table: patient, center, rating, comment, date, visibility, reply.
- Moderate: hide, show, remove (destructive confirmation).
- Clearing a linked review resets the filter.
- Read-only view dialog for the full comment/reply.

#### Activity — `/admin/activity`

- Paginated feed of center submissions/reviews, therapist joins, appointments, cancellations and reviews.
- Each row has a kind badge, subject, detail and timestamp; some rows link to the related record via
  `activityLinks`.
- Page size follows the API clamp (1–100).
- Empty state when there is no activity yet.

#### Settings — `/admin/settings`

| # | Use case | Details |
| --- | --- | --- |
| AS1 | Profile | Full name, phone, profile image (upload → URL → save) |
| AS2 | Notification defaults | Email/in-app/reminders/marketing |
| AS3 | Identity card | Email, role, active flag (read-only) |
| AS4 | Password | Current + new + confirmation |
| AS5 | Theme/language | Global providers |
| AS6 | Unsupported fields | “Maintenance mode” and site description are not persisted by the API; the UI does not rely on them |

### 8.6 Shared messaging screens

`pages/physiotherapist/Messages.jsx` and `Conversation.jsx` are used by **both** the patient and therapist
portals. Differences are driven by the session and the shell's `portal` prop:

- base path `/patient/messages` vs `/center/physiotherapist/messages`;
- the API scopes conversations to the authenticated participant;
- the shell's unread badge sums both roles' conversations;
- attachments reuse the same upload components but different upload endpoints.

### 8.7 Cross-screen behaviours

| Behaviour | Where | Details |
| --- | --- | --- |
| Session expiry | Global | Gateway refreshes once, retries, otherwise clears session; next guarded navigation redirects to login |
| Workspace refresh | Center/patient/therapist shells | 20 s poll + SignalR `workspaceChanged` + window focus |
| Notification bell | All shells | Filters by preference, marks one/all read, deep-links via target |
| Language/theme | Global | Immediate, persisted, `dir` flips layout |
| Unsaved changes | Profile/settings/record forms | `useUnsavedChanges` + confirm dialog |
| Destructive actions | Center/admin | Typed/explicit confirmation via `ConfirmDialog` |
| Pagination | Admin lists, discovery | `usePagination`/`useAdminQuery` or “show more” |
| Image uploads | Avatars/gallery | `fitImageFile`, preview, 2 MB server limit, type errors translated |
| Empty states | All lists | Purpose-written copy, usually with a primary action |
| Error states | All pages | Translated `ServiceError` code + retry where safe |

---

## 9. Component catalogue

### 9.1 Shared components (`src/components/shared/`)

Every folder contains a `.jsx` and a matching `.css` unless noted.

| Component | Responsibility / use cases |
| --- | --- |
| `ActionsMenu` | “⋯” actions menu over an `items` list (`label`, `icon`, `variant: 'danger'`, `disabled`, `onClick`); closes on outside click/Escape and moves focus with Arrow/Home/End. Default popper placement is what the center tables and `ChatHeader` use. Admin list tables pass the opt-in `portal` + `compact` extras: the panel is rendered into the body and positioned from the trigger's viewport rect (a horizontally scrolling table would clip it), with the small ghost trigger the dense rows use. |
| `AttachmentCard` | Renders a message attachment (image preview or file chip) with name and download action. |
| `Avatar` | Image-or-initials avatar with size variants and colour fallback; used for patients, therapists, admins, centers. |
| `Button` | Variants (primary/outline/ghost/danger), sizes, `loading`, `fullWidth`, icon children; disables while busy. |
| `ChatHeader` | Conversation header: counterpart avatar/name, role/center, back button on mobile, actions slot. |
| `ConversationItem` | One row in the conversation list: avatar, name, last message preview, time, unread badge, active state. |
| `ConversationList` | Scrollable list with search input, empty state, loading skeleton; keyboard navigable. |
| `FilterSelect` | Labelled select used by filter bars (status, city, specialty, rating); supports “all” option. |
| `Footer` | Public footer links, copyright, language/theme hints. |
| `FormField` | Label + input/select/textarea, required marker, error text, helper text, password visibility toggle, `dir` override for email/phone. |
| `LanguageSwitcher` | EN/AR toggle; updates `LanguageContext`, `dir`, and persists. |
| `MessageBubble` | Incoming/outgoing bubble with text, attachment, timestamp, read state; groups consecutive messages. |
| `MessageInput` | Composer: textarea with Enter-to-send/Shift+Enter newline, attachment picker, send button, character limit. |
| `Modal` | Lightweight modal with title, close button, backdrop/Escape close, focus trap and `aria-modal`. |
| `Navbar` | Top bar: brand, search slot, notifications, language, theme, quick settings, profile menu, mobile menu button. |
| `NotificationsDropdown` | Bell dropdown: list, unread dot, mark-one/mark-all, preference-aware filtering, empty state. |
| `Pagination` | Page numbers/prev/next with current page and total. Rendered by `CenterUI.Pager`; admin lists reach it indirectly through `AdminUI.AdminPagination` → `Pager`. |
| `ProfileMenu` | Avatar dropdown: role label, profile/settings links, sign out. |
| `QuickSettings` | Popover with theme/language shortcuts for fast changes. |
| `RatingStars` | Read-only or interactive 1–5 stars with accessible labels and half-star display for averages. |
| `SearchBar` | Debounced search input with clear button and search icon. |
| `Sidebar` | Role navigation: items, icons, active state, messages badge, collapsed/offcanvas behaviour, logout. |
| `StatusBadge` | Colour-coded status pill for appointment/center/account/review statuses with translated labels. |
| `ThemeToggle` | Light/dark switch bound to `ThemeContext`. |

### 9.2 Center components (`src/components/center/`)

| Component | Responsibility |
| --- | --- |
| `CenterUI.jsx` | Center-side primitives: `PageHeader` (title/description + actions), `Panel` (titled section with optional `action`/`viewAllLink`), `PageLink` (RTL-aware arrow link), `EmptyState` (`role="status"`), `Feedback` (success/error note), `RecordStatus` (appointment statuses → `StatusBadge`, staff/patient statuses → page-owned pill), `RecordImage` (lazy thumbnail with fallback tile), `SelectField` (label + `FilterSelect` + error), `Pager` (page-size select + range label + shared `Pagination`), `ConfirmDialog`, `TextDialog`. Admin reuses only `Feedback`, `EmptyState`, `RecordStatus`, `Pager`, `ConfirmDialog` and `Panel`. |
| `AppointmentDetails` | Appointment drawer/modal with patient, service, price, notes and status history (when available). |
| `AppointmentFilters` | Status tabs, search, therapist/service selects, date filter. |
| `AppointmentsTable` | Responsive table/card list of appointments with row actions. |
| `PatientDetails` | Patient drawer: demographics, visits, notes, edit action. |
| `RecordForm` | Generic modal form used for appointments/status/reasons/patients/therapists/services; field renderer, validation, busy state, unsaved-changes guard. |
| `TherapistScheduleForm` | Weekly window editor: day, start/end, available flag, add/update/delete, conflict messages. |
| `ClinicLocationEditor` | Address search/geolocate + coordinate confirmation for the center profile. |
| `ClinicMap` | Map preview (OpenStreetMap tiles) with pin and “open directions”. |
| `remaining/CenterInformationForm` | Center identity fields (names, descriptions, contact, address, website). |
| `remaining/LocationPanel` | Coordinates + confirmation wrapper around the location editor. |
| `remaining/NotificationPreferences` | Shared preference toggles for center/therapist. |
| `remaining/SecurityForm` | Current/new/confirm password form with validation. |
| `useCenter` | Reads the `CenterLayout` outlet context. |
| `usePagination` | Client-side pagination state for tables. |
| `useUnsavedChanges` | Dirty tracking + navigation/close guard. |

### 9.3 Patient components (`src/components/patient/`)

| Component | Responsibility |
| --- | --- |
| `AccountUI.jsx` | Shared account sections: section header, info rows, toggle rows, danger zone. |
| `AppointmentDates` | Horizontal date rail (next two weeks), disabled past/closed days. |
| `BookingModal` | Four-step booking flow (service, therapist, date/time, notes) with availability fetch and submit. |
| `CenterGallery` | Image grid + lightbox with keyboard navigation. |
| `DiscoveryUI.jsx` | Search/filter bar, result header, center card, favourite button, skeleton/empty/error states. |
| `PatientSecurityForm` | Password change for patients. |
| `ProfileEditor` | Editable profile form with avatar upload and validation. |
| `ReviewModal` | Rating + comment dialog for a completed visit. |
| `ReviewsCarousel` | Rating summary, distribution bars, horizontally scrollable reviews. |
| `TimeRail` | Slot chips grouped by morning/afternoon/evening with disabled/busy states. |
| `serviceIcon` | Maps specialty/service names to Font Awesome icons. |
| `useDiscovery` | Loads discovery + saved centers, subscribes to changes, refreshes on focus/storage, retry. |
| `usePatientAccount` | Loads account + appointments, subscribes, refreshes on focus, provides localized helpers. |
| `usePatientAvailability` | Fetches slots for service/therapist/date, aborts stale requests, exposes loading/error. |
| `usePatientLabels` | Patient-specific `t`/`name`/`money`/`date` helpers. |
| `useVisibleItems` | Progressive “show more” list state. |
| `pain-assessment/AssessmentResult` | Result card: suggested specialty, care level, guidance, next steps. |
| `pain-assessment/BodyMap` | Front/back body silhouette with selectable hotspots and zoom. |
| `pain-assessment/PainTexture` | Decorative pain-texture background/legend. |
| `pain-assessment/bodyHotspots` | Region definitions (id, label keys, polygon/coordinates, specialty hints). |

### 9.4 Admin components (`src/pages/admin/`)

| Component | Responsibility |
| --- | --- |
| `AdminUI.jsx` | Admin query/table primitives: `QueryState` (loading, error with retry, empty), `RecordDialog` (read-only label/value dialog), `AdminPagination` (center `Pager` with admin range copy, e.g. “Showing 1–10 of 42 patients”). |
| `AdminRecordDialogs.jsx` | Create/edit forms for centers, patients, therapists, appointments (field configs + validation + submit). |
| `AdminViewDialogs.jsx` | Read-only detail dialogs for center/patient/therapist/appointment/review. |
| `AdminUI.css` | Styles for the read-only `.admin-record` label/value rows used by `RecordDialog` and the view dialogs. |
| `activityLinks.js` | Maps activity kinds to routes/filters. |
| `useAdminQuery.js` | Debounced query state, pagination, request race protection, refresh. |

---

## 10. Hooks

| Hook | File | Contract |
| --- | --- | --- |
| `useAuth()` | `context/AuthContext.jsx` | `{ status, session, error }` from the external auth store; starts restoration |
| `useLanguage()` | `context/LanguageContext.jsx` | `{ language, dir, t, setLanguage }` |
| `useTheme()` | `context/ThemeContext.jsx` | `{ theme, setTheme, toggleTheme }` (consumed via `ThemeContext` in the shell) |
| `useDiscovery()` | `components/patient/useDiscovery.js` | `{ data, error, actor, retry }`; combines discovery + favourites, subscribes and reacts to focus/storage |
| `usePatientAccount()` | `components/patient/usePatientAccount.js` | `{ data, error, actor, language, dir, name, tr, common, retry }`; account + appointments |
| `useCenter()` | `components/center/useCenter.js` | `useOutletContext()` — the workspace snapshot provided by `CenterLayout` |
| `usePatientAvailability()` | `components/patient/usePatientAvailability.js` | Slot list/loading/error for the current booking selection |
| `usePatientLabels()` | `components/patient/usePatientLabels.js` | Localized patient helpers |
| `useVisibleItems()` | `components/patient/useVisibleItems.js` | `{ visible, hasMore, showMore }` progressive list |
| `usePagination()` | `components/center/usePagination.js` | Page/pageSize/total helpers |
| `useUnsavedChanges()` | `components/center/useUnsavedChanges.js` | Dirty flag + confirm-on-leave |
| `useAdminQuery()` | `pages/admin/useAdminQuery.js` | Query/filter/pagination state, debounce, abort/race handling |

`AuthContext` is intentionally not a React context provider; it subscribes to the module store with
`useSyncExternalStore`, so session changes propagate to every consumer without prop drilling.

---

## 11. Forms, validation and UX rules

### 11.1 Client-side validation

| Area | Rules |
| --- | --- |
| Auth | Name required; email shape; phone `^\+?[0-9()\-\s]{7,20}$` (normalised before submit); password ≥ 8; confirmation matches |
| Patient profile | Name required ≤150 (UI uses 100 for the counter); phone optional, 7–15 digits if present; city ≤100; gender `male|female|other`; DOB real, not in the future; image a relative/data/https URL |
| Center profile | Names required per language where the backend requires them; email valid; coordinates a finite pair within range and confirmed; URLs ≤500 |
| Service | Both names required; price 0–1,000,000; duration 5–600; specialty required |
| Therapist | Name required; experience 0–60; services only from the center |
| Appointment | Service/therapist/date/time required; date not in the past; slot must still be free |
| Review | Rating 1–5 required; comment ≤1000 |
| Assessment | All five questions answered; numeric range; “other” text required |
| Password change | Current required; new ≥ 8; confirmation matches |

Validation is duplicated on the server; the client rules exist for fast feedback and accessibility, not
as a security boundary.

### 11.2 Error presentation

- Field errors render under the field (`FormField error`) and receive focus when invalid.
- Global errors render in a `role="alert"` region; successes in `role="status"`.
- `ServiceError.code` is translated; unknown codes fall back to a generic “unexpected” message.
- Network/timeout failures suggest retrying; 429 mentions waiting.
- 404 on a detail route shows an empty/not-found panel instead of an error toast.

### 11.3 Interaction conventions

- Buttons disable and show a spinner while their request is in flight; refs guard double submits.
- Destructive actions require explicit confirmation (and often a typed reason).
- Forms with unsaved changes confirm before navigation/close.
- Lists refresh after writes via the shell event/poll; optimistic updates are limited to favourites and
  message bubbles.
- Dates display in the user's locale; API dates remain `YYYY-MM-DD`/ISO.
- Money is formatted with `Intl.NumberFormat` (`money(value, language, currency = 'USD')`); callers
  may pass a different ISO currency, and the default is **USD**.

---

## 12. Accessibility

Implemented:

- Skip link in `PublicLayout` (`#public-content`), main landmark with `tabIndex={-1}`.
- Semantic landmarks (`header`, `nav`, `main`, `footer`) and labelled navigation.
- `aria-label` on icon-only buttons; `aria-hidden` on decorative icons.
- Visible focus rings from `global.css`; focus moves to headings/feedback after submit.
- Modals: `aria-modal`, labelled title, Escape/backdrop close, focus trap and restore.
- Status/alert live regions for async feedback and pending states.
- Form labels bound to inputs; required markers; error text referenced by the field.
- Tables have headers; responsive card views keep labels.
- Keyboard support in menus, carousels and the gallery (`Escape`, arrows where implemented).
- Language switch updates `lang` and `dir`; email/phone inputs stay LTR in Arabic.
- Colour contrast follows the token palette in both themes.

Not implemented / partial:

- No automated axe/Lighthouse audit is part of the repo.
- Some custom dropdowns rely on click-outside rather than a full ARIA combobox pattern.
- The body-map hotspot selection is pointer-first; keyboard traversal exists but is basic.
- No reduced-motion media query for every animation.

---

## 13. Tests, lint and build

### 13.1 Test files

Run with the built-in Node test runner (no Vitest/Jest):

```bash
node --test src/tests/patient-phase1/account.test.js
```

| File | Focus |
| --- | --- |
| `tests/integration/messaging.test.js` | Conversation/message operations, participant scoping, unread counts, attachment mapping |
| `tests/integration/precommit-consistency.test.js` | Contract/consistency checks between operation maps, mocks and UI expectations |
| `tests/integration/refinements.test.js` | Center application review, refinements in center flows |
| `tests/integration/remaining-center.test.js` | Remaining center operations (preferences, security, images, coordinates) |
| `tests/integration/services.test.js` | Service CRUD/validation |
| `tests/integration/therapist-notifications.test.js` | Therapist notification mapping/preferences |
| `tests/integration/therapist-profile.test.js` | Therapist profile read/update rules |
| `tests/patient-phase1/account.test.js` | Patient account/profile/preferences/password |
| `tests/patient-phase1/discovery.test.js` | Discovery filtering/sorting/favourites |
| `tests/patient-phase1/integration.test.js` | Patient flows end-to-end at the service layer |
| `tests/patient-phase1/pain-assessment.test.js` | Assessment model, validation, care precedence |
| `tests/patient-phase1/refinements.test.js` | Patient UI/refinement rules |

These are **service/model tests** with in-memory stores; they do not render React or drive a browser.
`scripts/*.mjs` are manual browser smoke scripts, not part of CI.

### 13.2 Lint

```bash
npm run lint
```

Known baseline at the time of writing (pre-existing, unrelated to this document): two unused-symbol
errors — `viewAllLink` in `components/center/CenterUI.jsx` and `faShieldHalved` in
`pages/admin/Settings.jsx`. Everything else passes. Treat this as a baseline, not a guarantee.

### 13.3 Build

```bash
npm run build
```

The production build previously completed successfully. It has not been re-run while writing this
document (documentation-only change), and there is no test/build CI described in the repo.

---

## 14. Backend integration map

Every live operation maps to one endpoint. `mock` mode simulates the same operation; `api` mode uses
the paths below.

### 14.1 Auth

| UI action | Operation | Method + path |
| --- | --- | --- |
| Patient login | `loginPatient` | `POST /api/Auth/login?role=patient` |
| Center/therapist login | `loginCenter` | `POST /api/Auth/login?role=center` |
| Admin login | `loginAdmin` | `POST /api/Auth/login?role=admin` |
| Patient registration | `registerPatient` | `POST /api/Auth/register/patient` |
| Center registration | `registerCenter` | `POST /api/Auth/register/center` |
| Google sign-in | `completeGoogleSession` | challenge → `POST /api/Auth/google/sign-in` (plus register endpoints) |
| Restore session | `restoreSession` | reads the stored session; refresh happens in the gateway on 401 |
| Logout | `logout` | `POST /api/Auth/logout` |
| Change password (all roles) | `changePatientPassword` / `changeCenterPassword` / `changeAdminPassword` | `POST /api/Auth/change-password` |

### 14.2 Patient

| UI action | Operation | Endpoint |
| --- | --- | --- |
| Discovery list | `getPatientDiscovery` | `GET /api/centers` |
| Favourites | `getPatientSavedCenters`, `setPatientFavorite` | `GET/PUT/DELETE /api/patient/saved-centers[/{id}]` |
| Appointments | `getPatientAppointments` | `GET /api/patient/appointments` |
| Slots | `getPatientSlots` | `GET /api/centers/{centerId}/slots` |
| Request appointment | `requestAppointment` | `POST /api/appointments/request` |
| Review | `createPatientReview` | `POST /api/patient/reviews` |
| Account | `getPatientAccount` | `GET /api/patient/account` |
| Profile save | `savePatientProfile` | `PUT /api/patient/account/profile` |
| Preferences | `savePatientPreferences` | `PUT /api/patient/account/preferences` |
| Avatar | `preparePatientImage` | `POST /api/patient/account/image` |
| Assessment submit | `submitAssessment` | `POST /api/Assessment` |
| Assessment history/detail | `getAssessmentHistory`, `getAssessment` | `GET /api/Assessment/history`, `/api/Assessment/{id}` |
| Open conversation | `openPatientConversation` | `POST /api/conversations` |

### 14.3 Center / therapist

| UI action | Operation | Endpoint |
| --- | --- | --- |
| Workspace | `getWorkspace` | `GET /api/center/workspace` or `GET /api/therapist/workspace` |
| Center profile | `saveCenter` | `PUT /api/center/workspace/center` |
| Hours | `saveCenter` (hours branch) | `PUT /api/center/workspace/hours` |
| Gallery | `updateCenterImages`, `addGalleryImage` | `POST/DELETE /api/center/workspace/images` |
| Service | `saveService` | `POST/PUT /api/center/workspace/services[/{id}]` |
| Therapist | `saveTherapist` | `PUT /api/center/workspace/therapists/{id}` / `POST /api/center/therapists` |
| Patient | `savePatient` | `POST/PUT /api/center/workspace/patients[/{id}]` |
| Patient note | `addPatientNote` | `POST /api/center/workspace/patients/{id}/notes` |
| Appointment status | `updateAppointmentStatus` | `PUT /api/center/workspace/appointments/{id}/status` |
| Review reply | `updateReview` | `POST /api/center/workspace/reviews/{id}/reply` |
| Schedule read/write | `getTherapistSchedule`, `saveTherapistSchedule` | `/api/Schedules/therapists/{id}...` |
| Preferences | `saveNotificationPreferences` | `PUT .../workspace/preferences` |
| Therapist profile | `saveOwnProfile` | `PUT /api/therapist/profile` |
| Image | `prepareImage` | `POST /api/center/workspace/images` or `/api/therapist/workspace/images` |
| Messaging | `getMessagingWorkspace`, `sendMessage`, `markConversationRead` | `/api/conversations/...` |
| Notifications read | `markNotificationsRead` | `POST /api/notifications/read` |

### 14.4 Admin

| UI action | Operation | Endpoint |
| --- | --- | --- |
| Dashboard | `getAdminDashboard` | `GET /api/admin/dashboard` |
| Activity | `getAdminActivity` | `GET /api/admin/activity` |
| Centers list/detail | `getAdminCenters`, `getAdminCenter` | `GET /api/admin/centers[/{id}]` |
| Center status/edit/delete | `setAdminCenterStatus`, `updateAdminCenter`, `deleteAdminCenter` | `PUT .../status`, `PUT .../{id}`, `DELETE .../{id}` |
| Patients | `getAdminPatients`, `getAdminPatient`, `setAdminPatientStatus`, `updateAdminPatient`, `deleteAdminPatient` | `/api/admin/patients...` |
| Therapists | `getAdminPhysiotherapists`, `getAdminPhysiotherapist`, `addAdminPhysiotherapist`, `updateAdminPhysiotherapist`, `setAdminPhysiotherapistStatus`, `deleteAdminPhysiotherapist` | `/api/admin/physiotherapists...` |
| Appointments | `getAdminAppointments`, `getAdminAppointmentOptions`, `createAdminAppointment`, `updateAdminAppointment`, `deleteAdminAppointment` | `/api/admin/appointments...` |
| Reviews | `getAdminReviews`, `moderateAdminReview` | `/api/admin/reviews...` |
| Settings | `getAdminSettings`, `saveAdminSettings`, `prepareAdminImage` | `/api/admin/settings...` |
| Notifications | `getAdminNotifications`, `markNotificationsRead` | `GET /api/admin/notifications`, `POST /api/notifications/read` |

### 14.5 Known contract asymmetries

| Frontend expectation | Backend reality |
| --- | --- |
| Center “edit appointment” | `saveAppointment` is `notImplemented`; only status changes are exposed to centers |
| Patient cancel/reschedule | No patient endpoint at all |
| `changeCenterPassword` in mock mode | Mock adapter returns `passwordUnavailable`; API mode uses `/api/Auth/change-password` |
| Admin application review screen | `listCenterApplications`/`approveCenterApplication` exist in `authService` and are used by tests, but the admin UI reviews applications through center status instead |
| Admin site description / maintenance mode | Accepted by the form shape but ignored by the backend |
| `Approved` vs `confirmed` appointment status | Center “approve” sends `approved`; the UI maps it to its confirmed bucket, while the DB stores `Approved` |

---

## 15. Known gaps and limitations

### 15.1 Functional gaps

1. **No patient cancellation or rescheduling UI/endpoint.** The patient must contact the center.
2. **No center-side reschedule.** `saveAppointment` throws `unavailable`; centers can only change status.
3. **No therapist-side appointment status changes** — center/admin only.
4. **No password recovery UI** — the backend disables the endpoints.
5. **Google sign-in is unavailable in mock mode** and in any build without a Web Client ID; the button
   explains this instead of failing silently.
6. **Admin cannot create a center** — centers self-register and are approved/suspended.
7. **Admin settings’ maintenance mode and site description are decorative** (not persisted).
8. **No real-time typing/presence/delivery receipts** — only `workspaceChanged` refetch hints.
9. **No email/SMS** — notifications are in-app only.
10. **No pagination on discovery** — the whole approved catalog is fetched and filtered client-side.

### 15.2 Code/quality gaps

1. **`saveAppointment` is explicitly stubbed** in `backendContract.js`; any UI path that calls it fails
   with `unavailable`.
2. **`styles/responsive.css` is never imported**, so its breakpoints do nothing.
3. **Unused files**: `pages/public/PatientIntro.jsx`, `pages/public/CenterIntro.jsx`,
   `routes/RoutePlaceholders.jsx`; the nine empty `src/data/*.js` placeholders (except
   `centerPortal.js`) are dead.
4. **`authService` role/adapter logic is subtle**: patients prefer the live API whenever a base URL is
   configured, while other roles follow `VITE_DATA_MODE`. This is intentional but easy to misread.
5. **Mock state lives in `localStorage`** with versioned keys; clearing site data resets the demo, and
   different browsers show different demo states.
6. **Two sources of demo data** (`mock/*` and `data/centerPortal.js`) mean fixture drift is possible.
7. **No TypeScript and no runtime schema validation** — mappers tolerate shape drift, which hides
   contract regressions until a field is visibly missing.
8. **No React component tests**; coverage is service/model level.
9. **ESLint baseline has two unused-symbol errors** (see §13.2).
10. **The admin `useAdminQuery` and per-page filter states are duplicated**, so behaviour can drift
    between lists.
11. **Manual browser scripts** (`scripts/*.mjs`) are not wired into CI and require a running app.
12. **Auth pages do not auto-redirect an already signed-in user**; they rely on guarded routes.
13. **Notifications are preference-filtered in the UI**, not suppressed at creation, so a muted type can
    still consume a row/unread count server-side.
14. **`centerLocationService` depends on third-party geocoding quotas**; without a Geoapify key it falls
    back to Nominatim, which is rate-limited and less precise.
15. **Bundle is not code-split by route**; every page is in the main chunk.

---

## 16. Appendix — every file and its role

### 16.1 Root and tooling

| File | Role |
| --- | --- |
| `index.html` | SPA shell, meta, GIS script, `#root` |
| `vite.config.js` | React plugin, port 5175, `strictPort` |
| `eslint.config.js` | Flat ESLint config (browser globals, hooks, refresh) |
| `package.json` / `package-lock.json` | Dependencies and scripts |
| `scripts/pain-assessment-browser.mjs` | Manual assessment smoke script |
| `scripts/patient-portal-browser.mjs` | Manual patient portal smoke script |
| `docs/AUTHENTICATION.md` | Older auth notes |
| `docs/BACKEND_READINESS.md` | Older integration checklist |
| `docs/PROJECT_STRUCTURE.md` | Older structure notes (superseded) |

### 16.2 `src/` root and styles

| File | Role |
| --- | --- |
| `main.jsx` | Root render, providers, global CSS |
| `App.jsx` | Renders the route tree |
| `styles/variables.css` | Design tokens |
| `styles/light.css` / `dark.css` | Theme bindings |
| `styles/global.css` | Reset/base/typography/focus |
| `styles/responsive.css` | Breakpoints (currently unimported) |

### 16.3 Routes and contexts

| File | Role |
| --- | --- |
| `routes/AppRoutes.jsx` | Aggregates all route groups |
| `routes/PublicRoutes.jsx` | Landing, role select, auth, AuthShell |
| `routes/PatientRoutes.jsx` | Patient guard + layout + pages + shared messaging |
| `routes/CenterRoutes.jsx` | Center and therapist guards/layouts/pages |
| `routes/AdminRoutes.jsx` | Admin login + guard + layout + pages |
| `routes/ErrorRoutes.jsx` | Explicit error URLs + catch-all |
| `routes/RequireRole.jsx` | Auth/role guard and redirects |
| `routes/RoutePlaceholders.jsx` | Unused placeholder components |
| `context/AuthContext.jsx` | Auth store hook |
| `context/LanguageContext.jsx` | Language/direction/translation |
| `context/ThemeContext.jsx` | Light/dark theme |

### 16.4 Pages

| File | Role |
| --- | --- |
| `pages/public/LandingPage.jsx` | Marketing landing |
| `pages/public/RoleSelect.jsx` | Patient/center entry choice |
| `pages/public/PatientIntro.jsx` | Unused intro content |
| `pages/public/CenterIntro.jsx` | Unused intro content |
| `pages/auth/PatientLogin.jsx` | `<AuthForm role='patient' mode='login' />` |
| `pages/auth/PatientSignup.jsx` | `<AuthForm role='patient' mode='signup' />` |
| `pages/auth/CenterLogin.jsx` | `<AuthForm role='center' mode='login' />` |
| `pages/auth/CenterSignup.jsx` | `<AuthForm role='center' mode='signup' />` |
| `pages/auth/AdminLogin.jsx` | `<AuthForm role='admin' mode='login' />` |
| `pages/patient/Dashboard.jsx` | Patient home |
| `pages/patient/FindCenters.jsx` | Discovery |
| `pages/patient/CenterDetails.jsx` | Center profile + booking |
| `pages/patient/PhysiotherapistDetails.jsx` | Therapist profile + booking |
| `pages/patient/Appointments.jsx` | Appointment tabs/details/reviews |
| `pages/patient/Profile.jsx` | Profile view/edit |
| `pages/patient/Settings.jsx` | Preferences/password |
| `pages/patient/PainAssessment.jsx` | Assessment flow/history |
| `pages/center/Dashboard.jsx` | Center home |
| `pages/center/Appointments.jsx` | Appointment management |
| `pages/center/Patients.jsx` | Patient management |
| `pages/center/Physiotherapists.jsx` | Therapist management + schedules |
| `pages/center/Services.jsx` | Service management |
| `pages/center/Reviews.jsx` | Reviews + replies |
| `pages/center/CenterProfile.jsx` | Center identity/hours/gallery/location |
| `pages/center/Settings.jsx` | Preferences/password |
| `pages/physiotherapist/Profile.jsx` | Therapist profile |
| `pages/physiotherapist/Messages.jsx` | Conversation list (shared with patient) |
| `pages/physiotherapist/Conversation.jsx` | Thread (shared with patient) |
| `pages/physiotherapist/Settings.jsx` | Preferences/password |
| `pages/admin/Dashboard.jsx` | KPIs/charts |
| `pages/admin/Centers.jsx` | Center list/actions |
| `pages/admin/CenterDetail.jsx` | Center detail |
| `pages/admin/Patients.jsx` | Patient list/actions |
| `pages/admin/Physiotherapists.jsx` | Therapist list/actions |
| `pages/admin/Appointments.jsx` | Appointment list/CRUD |
| `pages/admin/Reviews.jsx` | Review moderation |
| `pages/admin/Activity.jsx` | Activity feed |
| `pages/admin/Settings.jsx` | Admin profile/preferences |
| `pages/admin/AdminUI.jsx` | Admin primitives |
| `pages/admin/AdminRecordDialogs.jsx` | Admin create/edit dialogs |
| `pages/admin/AdminViewDialogs.jsx` | Admin detail dialogs |
| `pages/admin/AdminUI.css` | Read-only record row styles |
| `pages/admin/activityLinks.js` | Activity → route mapping |
| `pages/admin/useAdminQuery.js` | Query/pagination hook |
| `pages/error/ErrorPage.jsx` | 404/403/500/offline/maintenance |

### 16.5 Services

| File | Role |
| --- | --- |
| `services/runtime.js` | Mode + http client |
| `services/authService.js` | Auth store/façade/destinations |
| `services/centerLocationService.js` | Geocoding/search |
| `services/centerSummaryService.js` | Center dashboard derivations |
| `services/patientSummaryService.js` | Patient appointment summary for center-side patient details |
| `services/messagingRealtime.js` | SignalR lifecycle |
| `services/api/backendContract.js` | All operations |
| `services/api/gateway.js` | Fetch/auth/refresh/errors |
| `services/api/httpClient.js` | Gateway wrapper |
| `services/api/mappers.js` | Payload → UI models |
| `services/api/operationAdapter.js` | Contract → adapter |
| `services/api/serviceError.js` | `ServiceError` + normaliser |
| `services/api/validationFields.js` | Field-error mapping |
| `services/auth/apiAuthAdapter.js` | API session adapter |
| `services/auth/mockAuthAdapter.js` | Demo auth adapter |
| `services/auth/session.js` | Session storage |
| `services/auth/authErrors.js` | Auth error types |
| `services/auth/googleAuth.js` | GIS + ticket flow |
| `services/auth/mockAccounts.js` | Demo accounts |
| `services/auth/centerLocation.js` | Registration geocoding |
| `services/center/access.js` | Role → allowed operations |
| `services/center/appointmentRules.js` | Status actions + overlap |
| `services/center/messagingModel.js` | Messaging view models |
| `services/center/messagingOperations.js` | Send/read helpers |
| `services/center/mockCenterAdapter.js` | Mock center operations |
| `services/center/remainingOperations.js` | Preferences/password/coordinates |
| `services/center/therapistNotifications.js` | Therapist bell mapping |
| `services/center/therapistRecords.js` | Therapist rows |
| `services/crud/adminService.js` | Admin dispatcher |
| `services/crud/appointmentService.js` | Appointment actions |
| `services/crud/centerPortalService.js` | Generic `callCenter` + workspace |
| `services/crud/centerRemainingService.js` | Center profile/preferences/replies |
| `services/crud/messageService.js` | Messaging CRUD |
| `services/crud/notificationService.js` | Read/preferences |
| `services/crud/patientAccountService.js` | Patient account |
| `services/crud/patientAssessmentService.js` | Assessment |
| `services/crud/patientDiscoveryService.js` | Discovery/favourites/appointments/reviews |
| `services/crud/patientService.js` | Center-side patient writes |
| `services/crud/serviceService.js` | Center-side service writes |
| `services/crud/therapistService.js` | Therapist profile writes |
| `services/mock/browserStore.js` | Namespaced localStorage |
| `services/mock/accountRepository.js` | Accounts |
| `services/mock/centerRepository.js` | Centers/therapists |
| `services/mock/adminData.js` | Admin fixtures |
| `services/patient/accountModel.js` | Grouping + profile validation |
| `services/patient/discoveryModel.js` | Filter/sort helpers |
| `services/patient/mockPatientAccount.js` | Mock account persistence |
| `services/patient/mockPatientOperations.js` | Mock patient operations |
| `services/patient/notificationPolicy.js` | Preferences/reminders |
| `services/patient/painAssessmentModel.js` | Assessment definition/scoring |
| `services/patient/specialtyMatching.js` | Symptom → specialty |

### 16.6 Utils, locales, data

| File | Role |
| --- | --- |
| `utils/authValidation.js` | `createAuthRequest`, `normalizePhone`, `validateAuthForm` |
| `utils/centerFormat.js` | `localized`, date/time/money/distance, `dateKey` |
| `utils/imageFile.js` | `fitImageFile` resize/compress |
| `utils/messageFormat.js` | Message grouping/timestamps |
| `utils/personImage.js` | Avatar fallback |
| `locales/en.js` | English strings |
| `locales/ar.js` | Arabic strings |
| `locales/painAssessment.js` | Assessment strings |
| `locales/patientRefinements.js` | Patient refinements |
| `data/centerPortal.js` | Center portal seed fixtures |
| `data/appointments.js` … `data/services.js` | Empty placeholders |

### 16.7 Tests

Listed in §13.1; each file is a standalone `node:test` suite using the mock services.

---

### Document maintenance

When routes, operations or pages change, update §4, §7.6, §8 and §14 together. The source of truth is
`src/routes/`, `src/services/api/backendContract.js`, `src/services/crud/` and the page files; this
document is a map of them.

