import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faPhone } from '@fortawesome/free-solid-svg-icons';
import Button from '../shared/Button/Button.jsx';
import { Feedback, RecordImage } from '../center/CenterUI.jsx';

// Keep loading and service errors consistent across account pages
export function AccountState({ state, children }) {
  if (state.error) return <>
    <Feedback error>
      {state.common(`error.${state.error.code || 'network'}`)}
    </Feedback>
    <Button onClick={state.retry}>{state.common('retry')}</Button>
  </>;
  if (!state.data) return <p role="status">{state.common('loading')}</p>;
  return children;
}

// Support Home/End and reverse the arrow keys in RTL
export function AccountTabs({
  id,
  tabs,
  selected,
  onChange,
  tr,
  dir,
  vertical = false
}) {
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width:767px)').matches);
  useEffect(() => {
    const query = window.matchMedia('(max-width:767px)');
    const change = () => setMobile(query.matches);
    query.addEventListener('change', change);
    return () => query.removeEventListener('change', change);
  }, []);
  // Settings tabs become horizontal on mobile, including keyboard navigation
  const isVertical = vertical && !mobile;
  return <div
    className={`pa-tabs ${vertical ? 'pa-tabs--vertical' : ''}`}
    role="tablist"
    aria-label={tr(id)}
    aria-orientation={isVertical ? 'vertical' : 'horizontal'}
  >
    {tabs.map(({ key, icon, count }) => <button
      key={key}
      id={`${id}-${key}`}
      role="tab"
      aria-selected={selected === key}
      aria-controls={`${id}-panel`}
      tabIndex={selected === key ? 0 : -1}
      onClick={() => onChange(key)}
      onKeyDown={event => {
        const forward = isVertical ? 'ArrowDown' : dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
        const backward = isVertical ? 'ArrowUp' : dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
        const index = event.key === 'Home'
          ? 0
          : event.key === 'End'
          ? tabs.length - 1
          : event.key === forward
          ? (tabs.findIndex(t => t.key === key) + 1) % tabs.length
          : event.key === backward ? (tabs.findIndex(t => t.key === key) + tabs.length - 1) % tabs.length : -1;
        if (index < 0) return;
        event.preventDefault();
        onChange(tabs[index].key);
        // Move keyboard focus along with the selected tab
        document.getElementById(`${id}-${tabs[index].key}`)?.focus();
      }}
    >
      {icon && <FontAwesomeIcon icon={icon} />}
      <span>
        {tr(key)}
        {count !== undefined && ` (${count})`}
      </span>
    </button>)}
  </div>;
}

// Leave a place over the avatar for page actions like changing the photo
export function PatientIdentity({ profile, name, tr, children }) {
  return <div className="pa-identity">
    <div className="pa-avatar">
      <RecordImage src={profile.imageUrl} alt={name(profile.name)} />
      {children}
    </div>
    <div className="pa-identity__text">
      <h2>{name(profile.name)}</h2>
      <p>{tr('patientAccount')}</p>
      <div className="pa-contact">
        <p>
          <FontAwesomeIcon icon={faEnvelope} />
          <bdi>{profile.email || tr('notProvided')}</bdi>
        </p>
        <p>
          <FontAwesomeIcon icon={faPhone} />
          <bdi>{profile.phone || tr('notProvided')}</bdi>
        </p>
      </div>
    </div>
  </div>;
}
