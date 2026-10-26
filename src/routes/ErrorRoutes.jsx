import { Route } from 'react-router-dom';
import PublicLayout from '../layouts/PublicLayout.jsx';
import {
  NotFoundPage,
  UnauthorizedPage,
  ServerErrorPage,
  OfflinePage,
  MaintenancePage,
} from '../pages/error/ErrorPage.jsx';

// Explicit error URLs plus the catch-all 404, rendered inside the public shell.
const errorRoutes = (
  <Route element={<PublicLayout />}>
    <Route path="/404" element={<NotFoundPage />} />
    <Route path="/403" element={<UnauthorizedPage />} />
    <Route path="/500" element={<ServerErrorPage />} />
    <Route path="/offline" element={<OfflinePage />} />
    <Route path="/maintenance" element={<MaintenancePage />} />
    <Route path="*" element={<NotFoundPage />} />
  </Route>
);

export default errorRoutes;
