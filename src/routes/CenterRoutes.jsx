import { Route, Navigate } from 'react-router-dom';
import CenterLayout from '../layouts/CenterLayout.jsx';
import Dashboard from '../pages/center/Dashboard.jsx';
import Appointments from '../pages/center/Appointments.jsx';
import Patients from '../pages/center/Patients.jsx';
import Physiotherapists from '../pages/center/Physiotherapists.jsx';
import Services from '../pages/center/Services.jsx';
import Reviews from '../pages/center/Reviews.jsx';
import CenterProfile from '../pages/center/CenterProfile.jsx';
import Settings from '../pages/center/Settings.jsx';
import RequireRole from './RequireRole.jsx';
import Messages from '../pages/physiotherapist/Messages.jsx';
import Conversation from '../pages/physiotherapist/Conversation.jsx';
import TherapistLayout from '../layouts/TherapistLayout.jsx';
import TherapistProfile from '../pages/physiotherapist/Profile.jsx';

// Keep the route-element contract consumed by the existing AppRoutes aggregator.
const centerRoutes = (
  <>
  <Route element={<RequireRole roles={['center']} />}>
  <Route path="/center" element={<CenterLayout />}>
    <Route index element={<Navigate to="dashboard" replace />} />
    <Route path="dashboard" element={<Dashboard />} />
    <Route path="appointments" element={<Appointments />} />
    <Route path="patients" element={<Patients />} />
    <Route path="physiotherapists" element={<Physiotherapists />} />
    <Route path="services" element={<Services />} />
    <Route path="reviews" element={<Reviews />} />
    <Route path="profile" element={<CenterProfile />} />
    <Route path="settings" element={<Settings />} />
  </Route>
  </Route>
  <Route element={<RequireRole roles={['physiotherapist']} />}>
    <Route path="/center/physiotherapist" element={<TherapistLayout />}>
      <Route index element={<Navigate to="profile" replace />} />
      <Route path="profile" element={<TherapistProfile />} />
      <Route path="messages" element={<Messages />} />
      <Route path="messages/:conversationId" element={<Conversation />} />
    </Route>
  </Route>
  </>
);

export default centerRoutes;
