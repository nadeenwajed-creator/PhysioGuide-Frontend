import { Route, Navigate } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout.jsx';
import AdminLogin from '../pages/auth/AdminLogin.jsx';
import AdminDashboard from '../pages/admin/Dashboard.jsx';
import AdminCenters from '../pages/admin/Centers.jsx';
import AdminCenterDetail from '../pages/admin/CenterDetail.jsx';
import AdminPatients from '../pages/admin/Patients.jsx';
import AdminPhysiotherapists from '../pages/admin/Physiotherapists.jsx';
import AdminAppointments from '../pages/admin/Appointments.jsx';
import AdminReviews from '../pages/admin/Reviews.jsx';
import AdminActivity from '../pages/admin/Activity.jsx';
import AdminSettings from '../pages/admin/Settings.jsx';
import RequireRole from './RequireRole.jsx';
import PublicLayout from "../layouts/PublicLayout.jsx";
import AuthShell from "../components/auth/AuthShell.jsx";


const adminRoutes = (
  <>
    <Route element={<PublicLayout />}>
      <Route element={<AuthShell />}>
          <Route path="/admin/login" element={<AdminLogin />} />
      </Route>
    </Route>
    <Route element={<RequireRole roles={["admin"]} loginPath="/admin/login" />}>
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="centers" element={<AdminCenters />} />
        <Route path="centers/:id" element={<AdminCenterDetail />} />
        <Route path="patients" element={<AdminPatients />} />
        <Route path="physiotherapists" element={<AdminPhysiotherapists />} />
        <Route path="appointments" element={<AdminAppointments />} />
        <Route path="reviews" element={<AdminReviews />} />
        <Route path="activity" element={<AdminActivity />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>
    </Route>
  </>
);

export default adminRoutes;
