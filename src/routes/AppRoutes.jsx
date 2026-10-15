import { Link, Routes, Route } from 'react-router-dom';

import centerRoutes from './CenterRoutes.jsx';
import patientRoutes from './PatientRoutes.jsx';
import publicRoutes from './PublicRoutes.jsx';

function NotFound() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1>Page not found</h1>
      <p>The requested page does not exist.</p>
      <Link to="/">Back to home</Link>
    </main>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {publicRoutes}
      {centerRoutes}
      {patientRoutes}

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;