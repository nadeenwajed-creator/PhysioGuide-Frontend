# PhysioGuide — Backend Integration Guide

PhysioGuide is a React/Vite frontend for physiotherapy booking and management. The Public/Auth, Center, Patient, and Physiotherapist interfaces are implemented and currently use shared mock data.

The frontend is prepared to communicate with backend APIs through a service layer, but the actual backend endpoints are not connected yet.

This document explains what currently works, how the frontend handles data, and what we need to connect during backend integration.

## 1. Current Frontend Status

| Area | Implemented in Frontend | Backend Integration Needed |
|---|---|---|
| Authentication | Login, signup, mock sessions, role-based access | Real login, registration, sessions/JWT, approval |
| Center | Dashboard, appointments, patients, physiotherapists, services, reviews, profile, settings | Real records, management operations, uploads |
| Patient | Dashboard, center discovery/details, booking, appointments, pain assessment, messages, profile, settings | Real center data, bookings, accounts, messaging |
| Physiotherapist | Restricted profile, messages, conversations | Staff accounts, permissions, assigned data |
| Admin | Not implemented as a portal yet | Admin authentication, management and approval APIs |

For current mock login behavior and demo accounts, see [Authentication](AUTHENTICATION.md).

## 2. How Frontend Data Works

Pages and components call service functions instead of communicating directly with a backend.

The main service files are located in `src/services/`:

- `authService.js`: Authentication and session handling.
- `centerPortalService.js`: Shared operations, access checks, and adapter selection.
- `appointmentService.js`: Appointments and booking.
- `patientAccountService.js`: Patient profile and account settings.
- `patientDiscoveryService.js`: Center search, details, availability, and related Patient operations.
- `messageService.js`: Messaging and attachments.
- Other services handle notifications, reviews, staff, and Center management.

The project currently uses mock repositories in `services/mock/`, `services/center/`, and `services/patient/`.

These repositories share the same records across the relevant portals. For example, an appointment created by a Patient is added to the Center's appointment data. Patient and Physiotherapist messaging also uses shared conversation records.

This allows us to test the workflows before connecting a real database.

## 3. API Integration

The frontend already has an API layer under `src/services/api/`.

Important files include:

| File | Purpose |
|---|---|
| `runtime.js` | Selects Mock or API mode |
| `api/backendContract.js` | Defines the operation mappings that need backend endpoints |
| `api/operationAdapter.js` | Converts frontend operations into API requests and responses |
| `api/httpClient.js` | Handles HTTP requests and errors |

Currently, the API operation mappings are empty. This means the frontend does not have confirmed backend endpoints configured yet.

During integration, we need to agree on the API URLs, request/response formats, IDs, status values, validation errors, and authentication method.

The existing service functions should remain the main connection between the pages and the backend. API requests should not be added directly inside React page components.

## 4. Main Backend Requirements

### Authentication and Roles

The backend needs to support real Patient and Center registration, login, session/JWT handling, and role-based permissions.

New Centers must remain Pending until approved by an Admin. Physiotherapists should use the Center Login entry point with restricted permissions.

The existing mock login will be replaced by real authentication without rebuilding the current login pages.

Google Identity Services integration is planned but is not connected to the frontend yet.

### Centers, Physiotherapists, and Services

The backend needs to store and manage Center information, services, prices, therapists, work schedules, assignments, and patient-related records.

Each Center must be able to manage only its own information.

The Patient Portal should receive public Center details, available services, prices, physiotherapist information, and approved review data without exposing private Center or Patient records.

### Appointments and Availability

The Patient selects a Center, service, Physiotherapist, date, and available time.

Patient booking requests currently start as Pending, while Centers manage appointment statuses through their portal.

The backend must check availability and prevent overlapping bookings, including conflicts across different Centers. It must also define how appointment updates, cancellations, and time zones are handled.

Patient cancellation is not currently implemented in the frontend.

### Messaging and Attachments

Patients and Physiotherapists can exchange messages through the existing conversation interface.

The backend needs to provide secure messaging, conversation access permissions, message delivery, read status, and attachment storage.

Messages must remain linked to the correct Patient, Physiotherapist, and Center.

### Notifications

The frontend displays notifications through the Navbar bell.

The backend will need to store notifications, track read status, respect user preferences, and support appointment updates and message notifications.

Scheduled reminders and real-time delivery are not currently provided by a backend service.

### Reviews and Ratings

The frontend can display existing ratings and reviews, and Centers can respond to reviews.

The backend will need to support Patient review submission, review eligibility after appointments, duplicate prevention, and review moderation.

Patient review submission is not currently implemented.

### Pain Assessment

Pain Assessment is a frontend-only questionnaire that provides preliminary specialty suggestions using predefined JavaScript rules.

The questions, visual interactions, and specialty result do not require a backend API or database.

The results page can use real Center discovery data to suggest Centers offering the relevant specialty.

No separate Pain Assessment submission endpoint is required for the current design.

## 5. Important Integration Notes

- Keep the same role-based routing and existing portal pages.
- Use backend authentication and permissions as the real security source.
- Preserve shared IDs and relationships between Patients, Centers, Physiotherapists, appointments, and conversations.
- Keep private records separate from public Center information.
- Do not treat browser mock storage as a real database.
- Confirm endpoint names and request/response formats with the backend team before implementing API mappings.
- Test cross-role workflows after integration, especially booking, messaging, notifications, and Center approval.

Two multi-Center cases also need further testing: notification acknowledgements across linked Centers and preventing a Patient from booking overlapping appointments at different Centers.

## 6. Next Step

Before connecting the frontend to the backend, both teams need to review the available backend APIs and agree on any missing operations or differences in data formats.

Once the contracts are confirmed, we can connect the existing service layer to the real backend and test each workflow without rebuilding the frontend pages.