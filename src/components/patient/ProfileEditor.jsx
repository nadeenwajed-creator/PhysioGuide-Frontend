import { useRef, useState } from 'react';
import Modal from '../shared/Modal/Modal.jsx';
import Button from '../shared/Button/Button.jsx';
import FormField from '../shared/FormField/FormField.jsx';
import { Feedback, RecordImage } from '../center/CenterUI.jsx';
import { preparePatientImage, savePatientProfile } from '../../services/patientAccountService.js';
import { profileErrors } from '../../services/patient/accountModel.js';

export default function ProfileEditor({ state, onClose, onSaved }) {
  const { data, actor, name, tr, common, dir } = state;
  // Copy only editable fields into the draft and keep email outside it
  const personal = Object.fromEntries(['name', 'phone', 'dateOfBirth', 'gender', 'city', 'imageUrl'].map(key => [key, data.profile[key]]));
  const [values, setValues] = useState({
    ...personal,
    name: name(personal.name)
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  // Use the same lock for saving the profile and preparing a photo
  const submitting = useRef(false);
  const update = (key, value) => setValues(current => ({
    ...current,
    [key]: value
  }));
  async function submit(event) {
    event.preventDefault();
    if (submitting.current) return;
    const invalid = profileErrors(values);
    setErrors(invalid);
    setFeedback(null);
    if (Object.keys(invalid).length) {
      // Bring the first invalid field into focus
      document.getElementById(`patient-${Object.keys(invalid)[0]}`)?.focus();
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      await savePatientProfile(actor, values);
      onSaved();
    } catch (error) {
      setErrors(error.fields || {});
      setFeedback(common(`error.${error.code || 'network'}`));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  // Keep the editor open while a save or photo operation is running
  return <Modal
    isOpen
    title={tr('editProfile')}
    onClose={() => !busy && onClose()}
    closeOnEscape={!busy}
    closeOnOverlay={!busy}
    showCloseButton={!busy}
    dir={dir}
    footer={<>
      <Button disabled={busy} variant="outline" onClick={onClose}>{common('cancel')}</Button>
      <Button form="patient-profile-form" type="submit" loading={busy}>{common('saveChanges')}</Button>
    </>}
  >
    <form id="patient-profile-form" className="pa-edit-form" onSubmit={submit} noValidate>
      <div className="pa-photo-editor">
        <RecordImage src={values.imageUrl} alt={values.name} />
        <label>
          {tr('changePhoto')}
          <input
            id="patient-imageUrl"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={async event => {
              const file = event.target.files?.[0];
              // Reset the input so choosing the same file can trigger change again
              event.target.value = '';
              if (!file || submitting.current) return;
              submitting.current = true;
              setBusy(true);
              setFeedback(null);
              try {
                // Put the prepared image in the draft until the profile is saved
                update('imageUrl', await preparePatientImage(actor, file));
              } catch (error) {
                setFeedback(common(`error.${error.code || 'image'}`));
              } finally {
                submitting.current = false;
                setBusy(false);
              }
            }}
          />
          <small>
            {tr('photoHelp')}
          </small>
        </label>
      </div>
      {['name', 'phone', 'dateOfBirth', 'city'].map(key => <FormField
        key={key}
        id={`patient-${key}`}
        label={tr(key)}
        type={key === 'dateOfBirth' ? 'date' : key === 'phone' ? 'tel' : 'text'}
        value={values[key]}
        required={key === 'name'}
        disabled={busy}
        error={errors[key] && (errors[key] === 'invalid' ? tr('invalidField') : common(`error.${errors[key]}`))}
        onChange={value => update(key, value)}
      />)}
      <label className="pa-select-label" htmlFor="patient-gender">
        {tr('gender')}
        <select
          id="patient-gender"
          value={values.gender}
          disabled={busy}
          onChange={event => update('gender', event.target.value)}
        >
          {['', 'female', 'male', 'other'].map(value => <option key={value} value={value}>
            {tr(value || 'notProvided')}
          </option>)}
        </select>
      </label>
      <FormField label={tr('email')} value={data.profile.email} readOnly />
      <Feedback error>{feedback}</Feedback>
    </form>
  </Modal>;
}
