import AuthForm from '../../components/auth/AuthForm.jsx';

// Shows the patient login form.
function PatientLogin() {
  return <AuthForm role='patient' mode='login' />;
}

export default PatientLogin;
