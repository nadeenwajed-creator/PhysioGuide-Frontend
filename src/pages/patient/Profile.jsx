import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarDays,
  faCheck,
  faCamera,
  faPen,
  faUser,
  faLocationDot
} from '@fortawesome/free-solid-svg-icons';
import Button from '../../components/shared/Button/Button.jsx';
import { PageHeader, Panel, Feedback } from '../../components/center/CenterUI.jsx';
import { AccountState, PatientIdentity } from '../../components/patient/AccountUI.jsx';
import ProfileEditor from '../../components/patient/ProfileEditor.jsx';
import usePatientAccount from '../../components/patient/usePatientAccount.js';
import { appointmentCounts } from '../../services/patient/accountModel.js';
import '../../components/patient/PatientAccount.css';

export default function Profile() {
  const state = usePatientAccount();
  const { data, name, tr, common, language } = state;
  const [editing, setEditing] = useState(false),
    [saved, setSaved] = useState(0);
  const profile = data?.profile,
    counts = appointmentCounts(data?.appointments || []);
  // Prepare translated display values and let missing fields use the fallback label
  const fields = profile && [
    [
      'dateOfBirth',
      faCalendarDays,
      profile.dateOfBirth ? new Intl.DateTimeFormat(language, {
        dateStyle: 'long'
      }).format(new Date(profile.dateOfBirth + 'T12:00:00')) : null
    ],
    ['gender', faUser, profile.gender ? tr(profile.gender) : null],
    ['city', faLocationDot, name(profile.city)]
  ];
  return <div className="pa-page">
    <PageHeader title={tr('profile')} description={tr('profileIntro')} />
    <AccountState state={state}>
      {profile && <Panel className="pa-profile">
        <aside className="pa-profile__identity">
          <PatientIdentity profile={profile} name={name} tr={tr}>
            <Button
              className="pa-camera"
              icon={faCamera}
              aria-label={tr('changePhoto')}
              onClick={() => setEditing(true)}
            />
          </PatientIdentity>
          <Button className="pa-profile-edit" icon={faPen} variant="outline" onClick={() => setEditing(true)}>
            {tr('editProfile')}
          </Button>
        </aside>
        <div className="pa-profile__content">
          <div className="pa-section-heading">
            <div>
              <h2>{tr('personalInformation')}</h2>
              <p>{tr('personalIntro')}</p>
            </div>
          </div>
          <dl className="pa-personal-fields">
            {fields.map(([key, icon, value]) => <div key={key}>
              <dt>
                <span className={`pa-field-icon pa-field-icon--${key}`}>
                  <FontAwesomeIcon icon={icon} />
                </span>
                <span>{tr(key)}</span>
              </dt>
              <dd>
                {value || tr('notProvided')}
              </dd>
            </div>)}
          </dl>
          <section className="pa-care">
            <h2>{tr('careActivity')}</h2>
            <p>{tr('careIntro')}</p>
            <div className="pa-care-grid">
              {['upcoming', 'completed'].map(key => <div key={key} className={`pa-care-card pa-care-card--${key}`}>
                <span className="pa-care-icon">
                  <FontAwesomeIcon icon={key === 'upcoming' ? faCalendarDays : faCheck} />
                </span>
                <span>
                  <strong>{counts[key]}</strong>
                  <span>
                    {tr(`${key}Appointments`)}
                  </span>
                </span>
              </div>)}
            </div>
          </section>
          <Feedback resetKey={saved}>
            {saved > 0 && common('saved')}
          </Feedback>
        </div>
      </Panel>}
      {editing && profile && <ProfileEditor
        state={state}
        onClose={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          // Change the feedback key so each successful save can show the message again
          setSaved(n => n + 1);
        }}
      />}
    </AccountState>
  </div>;
}
