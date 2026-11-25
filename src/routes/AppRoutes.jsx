// Route tree: public, center, patient, admin and error groups.

import { Routes } from 'react-router-dom';

import centerRoutes from './CenterRoutes.jsx';
import patientRoutes from './PatientRoutes.jsx';
import publicRoutes from './PublicRoutes.jsx';
import errorRoutes from './ErrorRoutes.jsx';
import adminRoutes from './AdminRoutes.jsx';

// Route table of the public, patient, center and admin portals.
function AppRoutes() {
  return (
    <Routes>
      {publicRoutes}
      {centerRoutes}
      {patientRoutes}
      {adminRoutes}
      {errorRoutes}
    </Routes>
  );
}

export default AppRoutes;