import { useRef, useState } from 'react';
import Button from '../shared/Button/Button.jsx';
import FormField from '../shared/FormField/FormField.jsx';
import { Feedback } from '../center/CenterUI.jsx';
import { changePatientPassword } from '../../services/patientAccountService.js';

export default function PatientSecurityForm({ state }) {
  const { actor, tr, common } = state;
  const [values, setValues] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({}),
    [feedback, setFeedback] = useState(null),
    [busy, setBusy] = useState(false);
  // Block a second submit before the loading state updates
  const submitting = useRef(false);
  async function submit(event) {
    event.preventDefault();
    if (submitting.current) return;
    // Check all three fields before asking the service to change the password
    const invalid = {};
    Object.keys(values).forEach(key => {
      if (!values[key]) invalid[key] = 'required';
    });
    if (values.newPassword && values.newPassword.length < 8) invalid.newPassword = 'passwordLength';
    if (values.confirmPassword && values.confirmPassword !== values.newPassword) invalid.confirmPassword = 'passwordMatch';
    setErrors(invalid);
    setFeedback(null);
    if (Object.keys(invalid).length) {
      // Move to the first field that needs fixing
      document.getElementById(`patient-security-${Object.keys(invalid)[0]}`)?.focus();
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      // The confirmation is only for this form, so do not send it
      await changePatientPassword(actor, {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword
      });
      // Clear the password fields after a successful change
      setValues({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
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
  // Keep passwords in this form only&clear them when leaving the tab
  return <form className="pa-security-form" onSubmit={submit} noValidate>
    <h2>{tr('security')}</h2>
    <p>{tr('securityIntro')}</p>
    {Object.keys(values).map(key => <FormField
      key={key}
      id={`patient-security-${key}`}
      label={common(key)}
      type="password"
      showPasswordToggle
      autoComplete={key === 'currentPassword' ? 'current-password' : 'new-password'}
      value={values[key]}
      required
      disabled={busy}
      error={errors[key] && common(`error.${errors[key]}`)}
      onChange={value => setValues(current => ({
        ...current,
        [key]: value
      }))}
    />)}
    <Feedback error={feedback?.error} resetKey={feedback}>{feedback?.text}</Feedback>
    <div className="pa-form-actions">
      <Button type="submit" loading={busy}>{tr('changePassword')}</Button>
    </div>
  </form>;
}
