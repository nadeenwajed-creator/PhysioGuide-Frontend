import { Route, Navigate } from 'react-router-dom';
import Dashboard from '../pages/patient/Dashboard.jsx';
import FindCenters from '../pages/patient/FindCenters.jsx';
import CenterDetails from '../pages/patient/CenterDetails.jsx';
import PhysiotherapistDetails from '../pages/patient/PhysiotherapistDetails.jsx';
import Appointments from '../pages/patient/Appointments.jsx';
import Profile from '../pages/patient/Profile.jsx';
import Settings from '../pages/patient/Settings.jsx';
import PainAssessment from '../pages/patient/PainAssessment.jsx';
import PatientLayout from '../layouts/PatientLayout.jsx';
import RequireRole from './RequireRole.jsx';
import Messages from '../pages/physiotherapist/Messages.jsx';
import Conversation from '../pages/physiotherapist/Conversation.jsx';

const patientRoutes = <Route path="/patient" element={<RequireRole roles={['patient']} loginPath="/patient/login" />}>
  <Route index element={<Navigate to="dashboard" replace />} />
  <Route element={<PatientLayout />}>
    <Route path="dashboard" element={<Dashboard />} />
    <Route path="centers" element={<FindCenters />} />
    <Route path="centers/:centerId" element={<CenterDetails />} />
    <Route path="centers/:centerId/therapists/:therapistId" element={<PhysiotherapistDetails />} />
    <Route path="appointments" element={<Appointments />} />
    <Route path="pain-assessment" element={<PainAssessment />} />
    <Route path="profile" element={<Profile />} />
    <Route path="settings" element={<Settings />} />
    <Route path="messages" element={<Messages />} />
    <Route path="messages/:conversationId" element={<Conversation />} />
  </Route>
</Route>;
export default patientRoutes;
