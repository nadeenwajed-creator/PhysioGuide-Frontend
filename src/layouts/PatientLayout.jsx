import CenterLayout from './CenterLayout.jsx';
// Reuse the established role-aware shell including it's existing messaging context
export default function PatientLayout() {
  return <CenterLayout portal="patient" />;
}
