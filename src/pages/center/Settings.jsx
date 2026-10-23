import { useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBuilding, faLock, faBell } from '@fortawesome/free-solid-svg-icons';
import { PageHeader, Panel } from '../../components/center/CenterUI.jsx';
import CenterInformationForm from '../../components/center/remaining/CenterInformationForm.jsx';
import SecurityForm from '../../components/center/remaining/SecurityForm.jsx';
import NotificationPreferences from '../../components/center/remaining/NotificationPreferences.jsx';
import useCenter from '../../components/center/useCenter.js';
import '../../components/center/remaining/RemainingUI.css';
import './Settings.css';
const sections = [['information', faBuilding], ['security', faLock], ['notifications', faBell]];

export default function Settings() {
  const { tr, actor } = useCenter();
  const [params, setParams] = useSearchParams();
  const requested = params.get('section');
  const section = sections.some(([id]) => id === requested) ? requested : 'information';
  return <div className="center-remaining center-settings">
    <PageHeader title={tr('settings')} description={tr('settingsDescription')} />
    <div className="center-settings__layout">
      <nav className="center-settings__navigation" aria-label={tr('settings')}>{sections.map(([id, icon]) => <button key={id} type="button" aria-current={id === section ? 'page' : undefined} onClick={() => setParams({ section: id })}><FontAwesomeIcon icon={icon} aria-hidden="true" /><span>{tr(`remaining.section.${id}`)}</span></button>)}</nav>
      <Panel title={tr(`remaining.section.${section}`)} className="center-settings__content">
        {section === 'information' && <CenterInformationForm key={actor.centerId} />}
        {section === 'security' && <SecurityForm />}
        {section === 'notifications' && <NotificationPreferences />}
      </Panel>
    </div>
  </div>;
}
