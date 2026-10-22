import { Route, Navigate } from 'react-router-dom';
import CenterLayout from '../layouts/CenterLayout.jsx';
import Dashboard from '../pages/center/Dashboard.jsx';
import Appointments from '../pages/center/Appointments.jsx';
import Patients from '../pages/center/Patients.jsx';
import Physiotherapists from '../pages/center/Physiotherapists.jsx';
import Services from '../pages/center/Services.jsx';
import RequireRole from './RequireRole.jsx';
import AccountDestination from '../components/auth/AccountDestination.jsx';

// Keep the route-element contract consumed by the existing AppRoutes aggregator.
const centerRoutes = (
  <>
  <Route element={<RequireRole roles={['center']} />}>
  <Route path="/center" element={<CenterLayout />}>
    <Route index element={<Navigate to="dashboard" replace />} />
    <Route path="dashboard" element={<Dashboard />} />
    <Route path="appointments" element={<Appointments />} />
    <Route path="patients" element={<Patients />} />
    <Route path="physiotherapists" element={<Physiotherapists />} />
    <Route path="services" element={<Services />} />
  </Route>
  </Route>
  <Route element={<RequireRole roles={['physiotherapist']} />}>
    <Route path="/center/physiotherapist" element={<AccountDestination />} />
  </Route>
  </>
);

export default centerRoutes;
