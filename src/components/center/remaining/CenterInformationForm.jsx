import { useEffect, useRef, useState } from 'react';
import Button from '../../shared/Button/Button.jsx';
import FormField from '../../shared/FormField/FormField.jsx';
import { Feedback } from '../CenterUI.jsx';
import useCenter from '../useCenter.js';
import { saveCenterInformation } from '../../../services/centerRemainingService.js';
import ClinicLocationEditor from '../ClinicLocationEditor.jsx';
import useUnsavedChanges from '../useUnsavedChanges.js';
import { validCoordinates, hasSavedCenterLocation } from '../../../services/centerLocationService.js';

// The API sends one string per field (with the Arabic copy on nameAr/aboutAr),
// while the mock keeps bilingual objects, so both shapes fill the form.
function readFields(center) {
  const text = value => (typeof value === 'string' ? value : '');
  return {
    name: center.name?.en || center.nameEn || text(center.name),
    nameAr: center.name?.ar || center.nameAr || '',
    email: center.email || '',
    phone: center.phone || '',
    address: center.address?.en || text(center.address),
    addressAr: center.address?.ar || center.addressAr || '',
    city: center.city || '',
    websiteUrl: center.websiteUrl || '',
    about: center.about?.en || center.aboutEn || text(center.about),
    aboutAr: center.about?.ar || center.aboutAr || '',
    hours: center.hours ? { ...center.hours } : { weekStart: '', weekEnd: '', fridayStart: '', fridayEnd: '' },
  };
}

export default function CenterInformationForm() {
  const { data: { center }, actor, tr, language } = useCenter();
  const [values, setValues] = useState(() => readFields(center));
  const [coordinates, setCoordinates] = useState(center.coordinates || null);
  const [confirmed, setConfirmed] = useState(hasSavedCenterLocation(center));
  const [locationTouched, setLocationTouched] = useState(false);
  const [locationBusy, setLocationBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fields, setFields] = useState({});
  const [feedback, setFeedback] = useState(null);
  const formRef = useRef(null);
  useEffect(() => {
    if (!busy && Object.keys(fields).length) formRef.current?.querySelector('[aria-invalid="true"]')?.focus();
  }, [fields, busy]);
  const disabled = busy || locationBusy;
  //  Only the primary address stands for the map pin; the Arabic label is a
  //  translation of it and does not need a new location confirmation.
  const set = (key, value) => { if (key === 'address') { setConfirmed(false); setLocationTouched(true); } setValues(current => ({ ...current, [key]: value })); setFeedback(null); };
  const field = (key, props = {}) => <FormField id={`information-${key}`} label={tr(key)} value={values[key]} onChange={value => set(key, value)} disabled={disabled} error={fields[key] && tr(`error.${fields[key]}`)} {...props} />;
  const serialized = JSON.stringify({ values, coordinates, confirmed });
  const [saved, setSaved] = useState(serialized);
  const [editorVersion, setEditorVersion] = useState(0);
  const dirty = serialized !== saved;
  useUnsavedChanges(dirty, tr('remaining.unsavedWarning'));
  function discard() {
    const previous = { values: readFields(center), coordinates: center.coordinates || null, confirmed: hasSavedCenterLocation(center) };
    setSaved(JSON.stringify(previous));
    setValues(previous.values); setCoordinates(previous.coordinates); setConfirmed(previous.confirmed);
    setLocationTouched(false); setFields({}); setFeedback(null); setEditorVersion(v => v + 1);
  }
  async function save(event) {
    event.preventDefault(); if (disabled) return;
    setFields({}); setFeedback(null);
    const invalid = {};
    const submitted = { ...values };
    if (!values.name.trim()) invalid.name = 'required';
    if (!values.email.trim()) invalid.email = 'required';
    else if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) invalid.email = 'email';
    if (!values.phone.trim()) invalid.phone = 'required';
    if (!values.city.trim()) invalid.city = 'required';
    if (!values.address.trim()) invalid.address = 'required';
    if (locationTouched) {
      if (!validCoordinates(coordinates)) invalid.coordinates = 'coordinates';
      else if (!confirmed) invalid.coordinates = 'confirmLocation';
      else { submitted.coordinates = coordinates; submitted.locationConfirmed = true; }
    }
    if (!Object.values(submitted.hours).some(Boolean)) submitted.hours = null;
    if (Object.keys(invalid).length) {
      setFields(invalid);
      setFeedback({ error: true, text: tr(invalid.coordinates ? `error.${invalid.coordinates}` : 'error.validation') });
      return;
    }
    setBusy(true);
    try {
      await saveCenterInformation(actor, submitted);
      setSaved(serialized); setLocationTouched(false);
      setFeedback({ text: tr('saved') });
    } catch (error) { setFields(error.fields || {}); setFeedback({ error: true, text: tr(`error.${error.code || 'network'}`) }); }
    finally { setBusy(false); }
  }
  return <form ref={formRef} onSubmit={save} noValidate className="remaining-information-form">
    <div className="center-form-grid">
      {field('name', { required: true, dir: 'ltr' })}{field('nameAr', { dir: 'rtl' })}
      {field('email', { type: 'email', required: true, dir: 'ltr' })}{field('phone', { type: 'tel', required: true, dir: 'ltr' })}
      {field('city', { required: true, dir: 'ltr' })}{field('websiteUrl', { type: 'url', dir: 'ltr' })}
      {field('about', { as: 'textarea', rows: 3, dir: 'ltr' })}{field('aboutAr', { as: 'textarea', rows: 3, dir: 'rtl' })}
    </div>
    <fieldset className="remaining-fieldset"><legend>{tr('location')}</legend>
      <div className="center-form-grid">{field('address', { required: true, dir: 'ltr' })}{field('addressAr', { dir: 'rtl' })}
      </div>
      <ClinicLocationEditor key={editorVersion} address={language === 'ar' ? values.addressAr || values.address : values.address || values.addressAr}
        coordinates={coordinates} confirmed={confirmed} disabled={busy} onBusyChange={setLocationBusy} invalid={fields.coordinates}
        onChange={selection => {
          setCoordinates(selection.coordinates); setConfirmed(false); setLocationTouched(true); setFeedback(null);
          if (selection.address) setValues(v => ({ ...v, [selection.language === 'ar' ? 'addressAr' : 'address']: selection.address }));
        }} onConfirm={value => { setConfirmed(value); setLocationTouched(true); }} />
    </fieldset>
    <fieldset className="remaining-fieldset"><legend>{tr('workingHours')}</legend><div className="center-form-grid">{['weekStart', 'weekEnd', 'fridayStart', 'fridayEnd'].map(key => <FormField key={key} type="time" label={tr(key)} value={values.hours[key]} disabled={disabled} onChange={value => set('hours', { ...values.hours, [key]: value })} />)}</div></fieldset>
    <Feedback error={feedback?.error} resetKey={feedback}>{feedback?.text}</Feedback>
    <div className="center-actions remaining-form-actions"><Button type="submit" loading={busy} disabled={locationBusy}>{tr('saveChanges')}</Button><Button variant="outline" disabled={!dirty || disabled} onClick={discard}>{tr('remaining.discardChanges')}</Button></div>
  </form>;
}
