import { Route, Navigate, Outlet } from 'react-router-dom';
import { CenterDashboardPlaceholder } from './RoutePlaceholders.jsx';

const centerRoutes = (
  <Route path="/center" element={<Outlet />}>
    <Route index element={<Navigate to="dashboard" replace />} />

    <Route
      path="dashboard"
      element={<CenterDashboardPlaceholder />}
    />
  </Route>
);

export default centerRoutes;