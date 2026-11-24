import AuthForm from '../../components/auth/AuthForm.jsx';

// Shows the admin login form (login only, no registration).
function AdminLogin() {
  return <AuthForm role='admin' mode='login' />;
}

export default AdminLogin;
