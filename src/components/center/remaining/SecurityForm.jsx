import { useState } from 'react';
import Button from '../../shared/Button/Button.jsx';
import FormField from '../../shared/FormField/FormField.jsx';
import { Feedback } from '../CenterUI.jsx';
import useCenter from '../useCenter.js';
import { changeCenterPassword } from '../../../services/centerRemainingService.js';

export default function SecurityForm() {
  const { actor, tr } = useCenter();
  const [values, setValues] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  async function submit(event) {
    event.preventDefault(); if (busy) return;
    const invalid = {};
    Object.keys(values).forEach(key => { if (!values[key]) invalid[key] = 'required'; });
    if (values.newPassword && values.newPassword.length < 8) invalid.newPassword = 'passwordLength';
    if (values.confirmPassword && values.confirmPassword !== values.newPassword) invalid.confirmPassword = 'passwordMatch';
    setErrors(invalid); setFeedback(null);
    if (Object.keys(invalid).length) { document.getElementById(`security-${Object.keys(invalid)[0]}`)?.focus(); return; }
    setBusy(true);
    try {
      await changeCenterPassword(actor, { currentPassword: values.currentPassword, newPassword: values.newPassword });
      setValues({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setFeedback({ text: tr('saved') });
    } catch (error) { setErrors(error.fields || {}); setFeedback({ error: true, text: tr(`error.${error.code || 'network'}`) }); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} noValidate className="remaining-security-form">
    <p className="remaining-help">{tr('remaining.securityHelp')}</p>
    {Object.keys(values).map(key => <FormField key={key} id={`security-${key}`} label={tr(key)} type="password" showPasswordToggle required autoComplete={key === 'currentPassword' ? 'current-password' : 'new-password'} value={values[key]} disabled={busy} error={errors[key] && tr(`error.${errors[key]}`)} onChange={value => setValues(current => ({ ...current, [key]: value }))} />)}
    <Feedback error={feedback?.error} resetKey={feedback}>{feedback?.text}</Feedback>
    <Button type="submit" loading={busy}>{tr('remaining.changePassword')}</Button>
  </form>;
}
