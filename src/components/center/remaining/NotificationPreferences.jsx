import { useState } from 'react';
import Button from '../../shared/Button/Button.jsx';
import { Feedback } from '../CenterUI.jsx';
import useCenter from '../useCenter.js';
import { saveCenterPreferences } from '../../../services/centerRemainingService.js';

const options = ['appointments', 'appointmentChanges', 'reviews'];
export default function NotificationPreferences() {
  const { data, actor, tr } = useCenter();
  const [values, setValues] = useState(() => Object.fromEntries(options.map(key => [key, data.notificationPreferences?.[key] !== false])));
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  async function save(event) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setFeedback(null);
    try { await saveCenterPreferences(actor, values); setFeedback({ text: tr('saved') }); }
    catch (error) { setFeedback({ error: true, text: tr(`error.${error.code || 'network'}`) }); }
    finally { setBusy(false); }
  }
  return <form onSubmit={save}>
    <p className="remaining-help">{tr('remaining.notificationHelp')}</p>
    <div className="remaining-preferences">{options.map(key => <label className="remaining-preference" key={key}>
      <span><strong>{tr(`remaining.notifications.${key}`)}</strong><small>{tr(`remaining.notifications.${key}Help`)}</small></span>
      <input type="checkbox" role="switch" checked={values[key]} disabled={busy} onChange={event => { setValues(current => ({ ...current, [key]: event.target.checked })); setFeedback(null); }} />
    </label>)}</div>
    <Feedback error={feedback?.error} resetKey={feedback}>{feedback?.text}</Feedback>
    <Button type="submit" loading={busy}>{tr('saveChanges')}</Button>
  </form>;
}
