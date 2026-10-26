# PhysioGuide — Authentication and User Roles

PhysioGuide currently uses **Mock Authentication** to test login, registration, and role-based access without connecting to a backend.

The frontend uses predefined test accounts and checks their email and password. After a successful login, the user is directed to the appropriate portal based on their role.

This system is for development and testing only. Real authentication will be connected during backend integration.

## 1. Main Files

| File | Purpose |
|---|---|
| `src/components/auth/AuthForm.jsx` | Shared login and signup forms |
| `src/services/authService.js` | Login, registration, logout, and session management |
| `src/services/auth/mockAuthAdapter.js` | Mock account validation and session handling |
| `src/context/AuthContext.jsx` | Makes authentication state available to React components |
| `src/routes/RequireRole.jsx` | Protects routes based on the user's role |
| `src/services/center/access.js` | Controls role permissions for application operations |

## 2. Test Accounts

The following accounts can be used to test the existing portals.

| Role | Email | Login Page |
|---|---|---|
| Center | `center@example.com` | Center Login |
| Patient | `patient@example.com` | Patient Login |
| Physiotherapist | `therapist3@example.com` | Center Login |
| Pending Center | `pending@example.com` | Center Login — access denied |

**Demo password for all accounts:** `PhysioGuide123!`

These are fictional accounts used only for local testing.

The Physiotherapist signs in through the Center Login page but receives different permissions. A pending Center cannot access its management portal until approved.

## 3. Login and Role-Based Access

When a user submits the login form, the frontend:

1. Checks the email and password against the mock accounts.
2. Identifies the user's role.
3. Creates a temporary browser session.
4. Redirects the user to the correct portal.

The main destinations are:

| Role | Destination |
|---|---|
| Patient | `/patient/dashboard` |
| Center | `/center/dashboard` |
| Physiotherapist | `/center/physiotherapist/profile` |
| Admin | Not implemented yet |

`RequireRole.jsx` protects the routes so users cannot access another role's pages. The services also check permissions before allowing certain operations.

These checks are implemented in the frontend and do not replace backend security.

## 4. Registration

**Patient Registration**

A new Patient can complete the signup form and create a mock account. The account can then be used to sign in through Patient Login.

**Center Registration**

A new Center submits its information, including contact details, address, and confirmed location. Its application is saved with a **Pending** status.

The Center cannot log in until its application is approved. The mock authentication service supports approval and rejection operations, but the Admin interface is not implemented yet.

**Physiotherapist Accounts**

Physiotherapists do not register through a public signup page. Their accounts are associated with staff records created by a Center.

In mock mode, newly registered Patients and provisioned Physiotherapists use the predefined demo password. Signup passwords are validated but are not saved as real credentials.

## 5. Sessions and Logout

After login, the mock system stores a temporary session in the browser.

The session:

- Identifies the current account and its role.
- Expires after 12 hours.
- Can be restored when the application is reopened.
- Is cleared when the user logs out.

The session does not contain a real JWT and is not verified by a server.

Because the mock session is shared across tabs on the same browser origin, separate browser profiles are useful when testing different roles at the same time.

## 6. Physiotherapist Permissions

Physiotherapists have restricted access compared with Center accounts.

They can view their assigned functionality, manage permitted personal profile information, and exchange messages with Patients.

Center management features, professional details, and service assignments remain controlled by the Center.

The Physiotherapist does not have a separate public portal or signup page.

## 7. Google Sign-In

The Google Sign-In button currently appears in the frontend but is disabled.

Google Identity Services (GIS) integration is planned. The backend team has outlined a Google ID Token flow involving a challenge, sign-in verification, and registration for new accounts.

However, this flow is **not connected to the current frontend**.

When implemented, Google authentication must follow the existing role and approval rules. In particular, new Centers must remain Pending until Admin approval.

## 8. Backend Integration

The current authentication works without a real database or authentication API.

During backend integration, we will replace the mock credential checks and browser-only sessions with real backend authentication and secure JWT/session handling.

The existing login and signup pages, role-based routes, and portal permissions will be reused where possible.

The integration will also require backend support for account management, Center approval, password operations, and secure logout.

For the remaining API requirements, see [Backend Readiness](BACKEND_READINESS.md).