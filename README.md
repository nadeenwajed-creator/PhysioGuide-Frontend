# PhysioGuide

PhysioGuide is a university graduation project designed to help patients find physiotherapy centers, explore available services, and book appointments. It also helps physiotherapy centers manage their appointments, patients, and staff, while allowing physiotherapists to communicate with their patients.

The frontend is developed using React and Vite. It currently uses mock authentication and shared demo data while backend integration is being prepared.

## Technologies

- React, Vite, and JavaScript
- React Router
- Bootstrap and React Bootstrap
- Font Awesome
- Inter and Noto Sans Arabic fonts
- English and Arabic support (RTL/LTR)
- Light and Dark themes

## Main Features

**Patient Portal**
- Search and filter physiotherapy centers.
- View center services and physiotherapist details.
- Request and manage appointments.
- Complete a preliminary pain assessment.
- Message physiotherapists and manage account information.

**Center Portal**
- Manage appointments and patient records.
- Manage physiotherapists, services, and schedules.
- View reviews and manage center information.

**Physiotherapist Portal**
- View assigned appointments.
- Manage personal profile information.
- Exchange messages with patients.

**Public Pages**
- Landing page and role selection.
- Patient and Center login and registration.

The Admin Portal is planned for a later development stage.

## Running the Project

Install the dependencies and start the frontend locally:

```bash
npm install
npm run dev
```

## Documentation

- [Project Structure](docs/PROJECT_STRUCTURE.md) — Frontend folders, routing, and services.
- [Authentication](docs/AUTHENTICATION.md) — Mock login, test accounts, and user roles.
- [Backend Integration](docs/BACKEND_READINESS.md) — Current functionality and backend requirements.