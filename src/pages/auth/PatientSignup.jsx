import AuthForm from '../../components/auth/AuthForm.jsx';

// Shows the patient signup form.
function PatientSignup() {
  return <AuthForm role='patient' mode='signup' />;
}

export default PatientSignup;
