import AuthForm from '../../components/auth/AuthForm.jsx';

// Center approval is handled separately by the backend.
function CenterSignup() {
  return <AuthForm role='center' mode='signup' />;
}

export default CenterSignup;
