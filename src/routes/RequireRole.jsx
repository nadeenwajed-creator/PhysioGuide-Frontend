import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { getAuthenticatedDestination, restoreSession } from '../services/authService.js';
import Button from '../components/shared/Button/Button.jsx';

export default function RequireRole({ roles, loginPath = '/center/login' }) {
  const { status, session, error } = useAuth();
  const { t } = useLanguage();
  if (status === 'loading') return <main><p role="status">{t('center.loading')}</p></main>;
  if (error) return <main className="center-page"><p role="alert">{t('auth.error.unavailable')}</p><Button onClick={() => restoreSession({ force: true })}>{t('center.retry')}</Button></main>;
  if (!session) return <Navigate to={loginPath} replace />;
  if (!roles.includes(session.role)) return <Navigate to={getAuthenticatedDestination(session.role)} replace />;
  return <Outlet />;
}
