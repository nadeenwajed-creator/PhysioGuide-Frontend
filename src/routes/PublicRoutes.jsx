import { Route } from 'react-router-dom';
import PublicLayout from '../layouts/PublicLayout.jsx';
import AuthShell from '../components/auth/AuthShell.jsx';
import LandingPage from '../pages/public/LandingPage.jsx';
import RoleSelect from '../pages/public/RoleSelect.jsx';
import PatientLogin from '../pages/auth/PatientLogin.jsx';
import PatientSignup from '../pages/auth/PatientSignup.jsx';
import CenterLogin from '../pages/auth/CenterLogin.jsx';
import CenterSignup from '../pages/auth/CenterSignup.jsx';

const publicRoutes = (
  <Route element={<PublicLayout />}>
    <Route path="/" element={<LandingPage />} />
    <Route path="/choose-role" element={<RoleSelect />} />
    <Route element={<AuthShell />}>
      <Route path="/patient/login" element={<PatientLogin />} />
      <Route path="/patient/signup" element={<PatientSignup />} />
      <Route path="/center/login" element={<CenterLogin />} />
      <Route path="/center/signup" element={<CenterSignup />} />
    </Route>
  </Route>
);

export default publicRoutes;
