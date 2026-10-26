import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { faBell, faLock, faPen, faUser } from '@fortawesome/free-solid-svg-icons';
import Button from '../../components/shared/Button/Button.jsx';
import { PageHeader, Panel, Feedback } from '../../components/center/CenterUI.jsx';
import { AccountState, AccountTabs, PatientIdentity } from '../../components/patient/AccountUI.jsx';
import PatientSecurityForm from '../../components/patient/PatientSecurityForm.jsx';
import usePatientAccount from '../../components/patient/usePatientAccount.js';
import { preferenceKeys } from '../../services/patient/accountModel.js';
import { savePatientPreferences } from '../../services/patientAccountService.js';
import '../../components/patient/PatientAccount.css';

function SettingsContent({ state }) {
  const { data, tr, common, dir, name, actor } = state;
  const navigate = useNavigate();
  const [tab, setTab] = useState('account');
  // Keep the draft when switching settings tabs
  const [draft, setDraft] = useState(null),
    [feedback, setFeedback] = useState(null),
    [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  // Show saved preferences until the patient starts editing
  const values = draft || data.preferences;
  async function save(event) {
    event.preventDefault();
    // Stop repeated submits before React updates the loading button
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setFeedback(null);
    try {
      await savePatientPreferences(actor, values);
      // Return to the saved data after the service accepts the draft
      setDraft(null);
      setFeedback({
        text: common('saved')
      });
    } catch (error) {
      setFeedback({
        error: true,
        text: common(`error.${error.code || 'network'}`)
      });
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return <Panel className="pa-settings">
    <AccountTabs
      id="settings"
      vertical
      tabs={[
        {
          key: 'account',
          icon: faUser
        },
        {
          key: 'security',
          icon: faLock
        },
        {
          key: 'notifications',
          icon: faBell
        }
      ]}
      selected={tab}
      onChange={setTab}
      tr={tr}
      dir={dir}
    />
    <div
      className="pa-settings__content"
      id="settings-panel"
      role="tabpanel"
      aria-labelledby={`settings-${tab}`}
    >
      {tab === 'account' && <>
        <h2>{tr('account')}</h2>
        <p>{tr('accountIntro')}</p>
        <PatientIdentity profile={data.profile} name={name} tr={tr} />
        <div className="pa-account-action">
          <Button icon={faPen} onClick={() => navigate('/patient/profile')}>
            {tr('editInProfile')}
          </Button>
        </div>
      </>}
      {tab === 'security' && <PatientSecurityForm state={state} />}
      {tab === 'notifications' && <form onSubmit={save}>
        <h2>{tr('notifications')}</h2>
        <p>{tr('notificationsIntro')}</p>
        <div className="pa-preferences">
          {preferenceKeys.map(key => <label key={key} className="pa-preference">
            <span>
              <strong>{tr(key)}</strong>
              <small>
                {tr(`${key}Help`)}
              </small>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={values[key]}
              disabled={busy}
              onChange={event => {
                setDraft({
                  ...values,
                  [key]: event.target.checked
                });
                setFeedback(null);
              }}
            />
          </label>)}
        </div>
        <Feedback error={feedback?.error} resetKey={feedback}>{feedback?.text}</Feedback>
        <div className="pa-form-actions">
          <Button type="submit" loading={busy}>{common('saveChanges')}</Button>
        </div>
      </form>}
    </div>
  </Panel>;
}

export default function Settings() {
  const state = usePatientAccount();
  return <div className="pa-page">
    <PageHeader title={state.tr('settings')} description={state.tr('settingsIntro')} />
    <AccountState state={state}>
      {state.data && <SettingsContent state={state} />}
    </AccountState>
  </div>;
}
