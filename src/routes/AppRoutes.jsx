import { Routes } from 'react-router-dom';

import centerRoutes from './CenterRoutes.jsx';
import patientRoutes from './PatientRoutes.jsx';
import publicRoutes from './PublicRoutes.jsx';
import errorRoutes from './ErrorRoutes.jsx';

function AppRoutes() {
  return (
    <Routes>
      {publicRoutes}
      {centerRoutes}
      {patientRoutes}
      {errorRoutes}
    </Routes>
  );
}

export default AppRoutes;