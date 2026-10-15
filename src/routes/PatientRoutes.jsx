import { Route, Navigate, Outlet } from 'react-router-dom';
import { PatientDashboardPlaceholder } from './RoutePlaceholders.jsx';

const patientRoutes = (
  <Route path="/patient" element={<Outlet />}>
    <Route index element={<Navigate to="dashboard" replace />} />

    <Route
      path="dashboard"
      element={<PatientDashboardPlaceholder />}
    />
  </Route>
);

export default patientRoutes;