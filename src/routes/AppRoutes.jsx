import { Routes } from 'react-router-dom';

import centerRoutes from './CenterRoutes.jsx';
import patientRoutes from './PatientRoutes.jsx';
import publicRoutes from './PublicRoutes.jsx';
import errorRoutes from './ErrorRoutes.jsx';
import adminRoutes from './AdminRoutes.jsx';

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