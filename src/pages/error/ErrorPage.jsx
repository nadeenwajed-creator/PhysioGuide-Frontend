import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faArrowRight,
  faCompass,
  faShieldHalved,
  faScrewdriverWrench,
  faTriangleExclamation,
  faWifi,
} from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../../context/LanguageContext.jsx';
import './ErrorPage.css';

// Shared shell for the static error placeholder pages.
function ErrorPage({ code, icon, titleKey, descriptionKey, retry = false, back = true }) {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <section className="error-page" aria-labelledby="error-page-title">
      <span className="error-page__icon" aria-hidden="true">
        <FontAwesomeIcon icon={icon} />
      </span>
      {code && <p className="error-page__code">{code}</p>}
      <h1 id="error-page-title" className="error-page__title">{t(titleKey)}</h1>
      <p className="error-page__description">{t(descriptionKey)}</p>
      <div className="error-page__actions">
        {retry && (
          <button type="button" className="public-link-button" onClick={() => window.location.reload()}>
            {t('error.retry')}
          </button>
        )}
        <Link
          className={`public-link-button${retry ? ' public-link-button--outline' : ''}`}
          to="/"
        >
          {t('public.backHome')}
          <FontAwesomeIcon icon={faArrowRight} className="public-directional" aria-hidden="true" />
        </Link>
        {back && (
          <button
            type="button"
            className="public-link-button public-link-button--outline"
            onClick={() => navigate(-1)}
          >
            <FontAwesomeIcon icon={faArrowLeft} className="public-directional" aria-hidden="true" />
            {t('error.goBack')}
          </button>
        )}
      </div>
    </section>
  );
}

export function NotFoundPage() {
  return (
    <ErrorPage
      code="404"
      icon={faCompass}
      titleKey="error.notFound.title"
      descriptionKey="error.notFound.description"
    />
  );
}

export function UnauthorizedPage() {
  return (
    <ErrorPage
      code="403"
      icon={faShieldHalved}
      titleKey="error.forbidden.title"
      descriptionKey="error.forbidden.description"
    />
  );
}

export function ServerErrorPage() {
  return (
    <ErrorPage
      code="500"
      icon={faTriangleExclamation}
      titleKey="error.server.title"
      descriptionKey="error.server.description"
      retry
    />
  );
}

export function OfflinePage() {
  return (
    <ErrorPage
      icon={faWifi}
      titleKey="error.offline.title"
      descriptionKey="error.offline.description"
      retry
      back={false}
    />
  );
}

export function MaintenancePage() {
  return (
    <ErrorPage
      icon={faScrewdriverWrench}
      titleKey="error.maintenance.title"
      descriptionKey="error.maintenance.description"
      back={false}
    />
  );
}
