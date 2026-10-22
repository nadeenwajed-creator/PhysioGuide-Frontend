// Public test credentials, not production secrets. Never use real credentials with this adapter.
export const MOCK_PASSWORD = 'PhysioGuide123!';
export const MOCK_CENTER_ID = 'center-demo';
export const mockAccounts = [
  { id: 'account-center', role: 'center', centerId: MOCK_CENTER_ID, name: 'Nablus Physio Center', email: 'center@example.com', status: 'approved' },
  { id: 'account-patient', role: 'patient', patientId: 'patient-1', name: 'Ahmad Ali', email: 'patient@example.com', status: 'active' },
  { id: 'account-pending', role: 'center', name: 'Awaiting approval', email: 'pending@example.com', status: 'pending' },
];
