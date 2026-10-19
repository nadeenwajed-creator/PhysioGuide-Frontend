import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowDown, faArrowRight, faCalendarDays, faLocationDot, faClipboardCheck, faStar, faShieldHeart } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../../context/LanguageContext.jsx';
import logo from '../../assets/logo/physioguide-icon.svg';
import hero from '../../assets/images/landing/physiotherapy-hero.webp';
import './LandingPage.css';

// Lists the services shown on the landing page.
const services = [
  { key: 'appointments', icon: faCalendarDays },
  { key: 'centers', icon: faLocationDot },
  { key: 'assessment', icon: faClipboardCheck },
  { key: 'reviews', icon: faStar },
  { key: 'care', icon: faShieldHeart },
];

// Section IDs match the navigation links.
function LandingPage() {
  const { t } = useLanguage();

  return (
    <div className="landing-page">
      <section className="landing-page__hero" id="home" aria-labelledby="landing-title">
        <div className="landing-page__hero-copy">
          <h1 id="landing-title">{t('landing.headline')}</h1>
          <p className="landing-page__lead">{t('landing.description')}</p>
          <div className="landing-page__actions">
            <Link className="public-link-button" to="/choose-role">{t('auth.signIn')}<FontAwesomeIcon icon={faArrowRight} className="public-directional" aria-hidden="true" /></Link>
            <a className="public-link-button public-link-button--outline" href="#about">{t('landing.discover')}<FontAwesomeIcon icon={faArrowDown} aria-hidden="true" /></a>
          </div>
        </div>
        <div className="landing-page__hero-image">
          <img src={hero} alt={t('landing.heroAlt')} width="1536" height="1024" fetchPriority="high" />
        </div>
      </section>
      <section id="about" className="landing-page__about" aria-labelledby="about-title">
        <div className="landing-page__about-mark"><img src={logo} alt="" width="200" height="200" loading="lazy" /></div>
        <div>
          <h2 id="about-title" className="landing-page__section-title">{t('public.about')}</h2>
          <p className="landing-page__about-text">{t('landing.aboutText')}</p>
          <div id="how-it-works" className="landing-page__how">
            <h3>{t('public.howItWorks')}</h3>
            <ol>{[1, 2, 3].map((step) => <li key={step}><span aria-hidden="true">{step}</span>{t(`landing.step${step}`)}</li>)}</ol>
          </div>
        </div>
      </section>
      <section id="services" className="landing-page__services" aria-labelledby="services-title">
        <h2 id="services-title" className="landing-page__section-title">{t('public.services')}</h2>
        <p className="landing-page__subtitle">{t('landing.servicesIntro')}</p>
        <div className="landing-page__service-grid">
          {services.map((service) => (
            <article key={service.key} className="landing-page__service">
              <span className="landing-page__service-icon"><FontAwesomeIcon icon={service.icon} aria-hidden="true" /></span>
              <h3>{t(`landing.service.${service.key}.title`)}</h3>
              <p>{t(`landing.service.${service.key}.description`)}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default LandingPage;
