import { Route, Navigate } from 'react-router-dom';
import AccountDestination from '../components/auth/AccountDestination.jsx';
import RequireRole from './RequireRole.jsx';

const patientRoutes = (
  <Route path="/patient" element={<RequireRole roles={['patient']} loginPath="/patient/login" />}>
    <Route index element={<Navigate to="dashboard" replace />} />

    <Route
      path="dashboard"
      element={<AccountDestination />}
    />
  </Route>
);

export default patientRoutes;
