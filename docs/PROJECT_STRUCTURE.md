# PhysioGuide — Project Structure

PhysioGuide is a physiotherapy booking and management web application built with React, Vite, JavaScript, and CSS. The frontend includes separate interfaces for Patients, Centers, and Physiotherapists, along with public pages for registration and login. The Admin Portal is planned but has not been implemented yet.

This document explains how the frontend files are organized and where to find the main parts of the project.

## 1. Folder Structure

```text
PhysioGuide/
├── docs/                  Project documentation
├── public/                Public static files (currently empty)
├── scripts/               Browser testing scripts
├── src/
│   ├── assets/            Images, logos, and sample attachments
│   ├── components/        Shared and role-specific UI components
│   ├── context/           Authentication, theme, and language state
│   ├── data/              Mock data used during development
│   ├── layouts/           Public and portal layouts
│   ├── locales/           English and Arabic translations
│   ├── pages/             Application pages grouped by role
│   ├── routes/            Application routes and access protection
│   ├── services/          Application logic, mock data access, and APIs
│   ├── styles/            Global styles, colors, and themes
│   ├── tests/             Automated tests and development tests
│   ├── utils/             Helper and validation functions
│   ├── App.jsx            Main application component
│   └── main.jsx           React application entry point
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

The project uses one React application with different routes for each user role. We do not create a separate React project for each portal.

## 2. Pages and Components

The `src/pages/` folder contains the main pages users visit.

- `public/` and `auth/`: Landing page, role selection, login, and signup.
- `center/`: Dashboard, Appointments, Patients, Physiotherapists, Services, Reviews, Center Profile, and Settings.
- `patient/`: Dashboard, Find Centers, Center Details, Physiotherapist Details, Appointments, Pain Assessment, Profile, and Settings.
- `physiotherapist/`: Profile, Messages, and Conversation.
- `admin/`: Reserved for future Admin pages.

The `src/components/` folder contains reusable parts of those pages, such as forms, cards, modals, filters, and navigation elements.

Common elements like the Navbar, Sidebar, and Footer are kept in `components/shared/` so the portals can use the same design.

Some components are shared across roles. For example, the Patient and Physiotherapist messaging pages reuse the same conversation components.

CSS files are usually kept near the pages or components they belong to. Shared colors and global styling are defined in `src/styles/`.

## 3. Layouts and Routing

Routing is managed with React Router.

The main application flow is:

`index.html → main.jsx → App.jsx → AppRoutes.jsx`

The `src/routes/` folder includes:

- `PublicRoutes.jsx` for public pages and authentication.
- `CenterRoutes.jsx` for Center and Physiotherapist routes.
- `PatientRoutes.jsx` for Patient routes.
- `RequireRole.jsx` for checking access permissions.

Layouts define the common structure around pages. For example, `PublicLayout.jsx` is used for public pages, while `CenterLayout.jsx` provides the shared portal structure.

`PatientLayout.jsx` and `TherapistLayout.jsx` reuse the shared portal layout with the appropriate role configuration.

Protected routes prevent users from accessing pages outside their assigned roles. For example, a Patient cannot access Center management pages.

The Physiotherapist has limited access and does not have a separate public registration page.

## 4. Authentication and User Roles

Currently, PhysioGuide uses **Mock Authentication** for development and testing.

We have test accounts with email and password credentials for the Patient, Center, and Physiotherapist roles. These accounts allow us to test the different portals without connecting to a real backend.

When a user signs in, the frontend checks the mock credentials, identifies the account's role, and directs the user to the appropriate portal through role-based routing and protected routes.

Physiotherapists use the same Center Login page, but their permissions are limited to their assigned functionality.

This is a development login system, not real authentication. It is not connected to a database or authentication API.

During backend integration, the mock credential checks will be replaced with backend authentication and secure session/JWT handling. The existing login pages, routing structure, and role-based permissions will remain the starting point for integration.

Google Sign-In is currently disabled in the frontend and is planned for later integration.

For more details, see [Authentication](AUTHENTICATION.md).

## 5. Services and Mock Data

The `src/services/` folder contains the logic used by pages and components to work with application data.

It is organized into:

| Location | Purpose |
|---|---|
| `services/` root | Functions used directly by pages and components |
| `services/auth/` | Mock authentication and account handling |
| `services/center/` | Center operations, permissions, appointments, and messaging |
| `services/patient/` | Patient accounts, center discovery, booking, and assessment-related logic |
| `services/mock/` | Mock repositories and browser-based data storage |
| `services/api/` | HTTP communication and API integration structure |
| `data/` | Initial sample records used by the mock system |

Pages normally call a service function instead of directly handling storage or backend requests.

For example, Patient booking and Center appointment management use the same underlying mock records. This allows a booking made by a Patient to appear in the Center Portal.

The same approach is used for related services, physiotherapists, and messaging, with shared records and IDs.

The current mock system stores development data in the browser. It is not a real backend database.

The API structure is prepared for future integration, but the required backend operation mappings are not configured yet. More information is available in [Backend Readiness](BACKEND_READINESS.md).

## 6. Shared State and Design

The `src/context/` folder handles application-wide state:

- `AuthContext.jsx` provides access to the current authentication state.
- `ThemeContext.jsx` manages Light and Dark modes.
- `LanguageContext.jsx` manages English, Arabic, and RTL/LTR direction.

The project uses shared colors, typography, layouts, and UI components to keep all portals visually consistent.

English and Arabic text is managed through `src/locales/`, while global colors and styling are defined in `src/styles/`.

## 7. Tests

The project includes automated tests for authentication, services, appointments, messaging, Patient features, and shared data behavior.

Test files are mainly organized under:

- `src/tests/public-auth/`
- `src/tests/integration/`
- `src/tests/patient-phase1/`

The `src/tests/shared-lab/` folder contains manual component demonstrations rather than automated tests.

Browser testing scripts are stored in `scripts/`.

The README contains the main commands for running the project, linting, building, and testing.

## 8. Adding a New Feature

When adding a feature to PhysioGuide:

1. Add the main page under the appropriate `src/pages/` folder and place reusable components under `src/components/`.
2. Reuse the existing layouts, styles, contexts, and service functions instead of creating duplicate systems.
3. Add any required English and Arabic translations, then connect the page through the appropriate route.
4. Test the feature and check that it works with the existing roles, shared data, and responsive design.

For backend integration, update the appropriate service or API adapter rather than placing API requests directly inside page components.

The goal is to keep the project organized and make it easier for both frontend and backend developers to understand and maintain.