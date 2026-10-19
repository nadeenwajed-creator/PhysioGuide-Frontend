import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faHouseMedical, faUserInjured } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../../context/LanguageContext.jsx';
import logo from '../../assets/logo/physioguide-icon.svg';
import './RoleSelect.css';

// Opens the login page for the selected role.
function RoleSelect() {
  const { t } = useLanguage();

  // Moves the light toward the mouse pointer.
  function moveGlow(event) {
    if (event.pointerType !== 'mouse') return;
    const card = event.currentTarget;
    const bounds = card.getBoundingClientRect();
    card.style.setProperty('--glow-x', `${event.clientX - bounds.left}px`);
    card.style.setProperty('--glow-y', `${event.clientY - bounds.top}px`);
  }

  function resetGlow(event) {
    event.currentTarget.style.removeProperty('--glow-x');
    event.currentTarget.style.removeProperty('--glow-y');
  }

  return (
    <section className="role-select" aria-labelledby="role-select-title">
      <Link to="/" className="role-select__brand" aria-label={t('public.home')}><img src={logo} alt="" width="56" height="56" /><span>PhysioGuide</span></Link>
      <h1 id="role-select-title">{t('role.title')} <span>PhysioGuide?</span></h1>
      <p className="role-select__subtitle">{t('role.subtitle')}</p>
      <div className="role-select__cards">
        {['patient', 'center'].map((role) => (
          <Link key={role} to={`/${role}/login`} className="role-select__card" onPointerMove={moveGlow} onPointerLeave={resetGlow}>
            <span className="role-select__icon"><FontAwesomeIcon icon={role === 'patient' ? faUserInjured : faHouseMedical} aria-hidden="true" /></span>
            <h2>{t(`role.${role}.title`)}</h2>
            <p>{t(`role.${role}.description`)}</p>
            <span className="role-select__arrow"><FontAwesomeIcon icon={faArrowRight} className="public-directional" aria-hidden="true" /></span>
          </Link>
        ))}
      </div>
      <p className="role-select__values">{t('role.values')}</p>
    </section>
  );
}

export default RoleSelect;
