import { Route, Navigate } from 'react-router-dom';
import AccountDestination from '../components/auth/AccountDestination.jsx';
import RequireRole from './RequireRole.jsx';
import CenterLayout from '../layouts/CenterLayout.jsx';
import Messages from '../pages/physiotherapist/Messages.jsx';
import Conversation from '../pages/physiotherapist/Conversation.jsx';

const patientRoutes = (
  <Route path="/patient" element={<RequireRole roles={['patient']} loginPath="/patient/login" />}>
    <Route index element={<Navigate to="dashboard" replace />} />

    <Route
      path="dashboard"
      element={<AccountDestination />}
    />
    <Route element={<CenterLayout portal="patient" />}>
      <Route path="messages" element={<Messages />} />
      <Route path="messages/:conversationId" element={<Conversation />} />
    </Route>
  </Route>
);

export default patientRoutes;
