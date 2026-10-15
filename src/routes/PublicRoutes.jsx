import { Route, Outlet } from 'react-router-dom';
import { PagePlaceholder } from './RoutePlaceholders.jsx';

const publicRoutes = (
  <Route element={<Outlet />}>
    <Route
      path="/"
      element={<PagePlaceholder title="PhysioGuide Landing" />}
    />

    <Route
      path="/choose-role"
      element={<PagePlaceholder title="Choose Your Role" />}
    />

    <Route
      path="/center/login"
      element={<PagePlaceholder title="Center Login" />}
    />

    <Route
      path="/center/signup"
      element={<PagePlaceholder title="Center Sign Up" />}
    />

    <Route
      path="/patient/login"
      element={<PagePlaceholder title="Patient Login" />}
    />

    <Route
      path="/patient/signup"
      element={<PagePlaceholder title="Patient Sign Up" />}
    />
  </Route>
);

export default publicRoutes;