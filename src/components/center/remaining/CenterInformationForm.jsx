import { useEffect, useRef, useState } from 'react';
import Button from '../../shared/Button/Button.jsx';
import FormField from '../../shared/FormField/FormField.jsx';
import { Feedback, RecordImage } from '../CenterUI.jsx';
import useCenter from '../useCenter.js';
import { saveCenterInformation } from '../../../services/centerRemainingService.js';
import { prepareCenterImage } from '../../../services/centerPortalService.js';
import { locateCenterDevice, lookupCenterAddress, validCoordinates } from '../../../services/centerLocationService.js';

export default function CenterInformationForm() {
  const { data: { center }, actor, tr, language } = useCenter();
  const [values, setValues] = useState(() => ({
    name: center.name?.en || '', nameAr: center.name?.ar || '', email: center.email || '', phone: center.phone || '',
    address: center.address?.en || '', addressAr: center.address?.ar || '',
    about: center.about?.en || '', aboutAr: center.about?.ar || '', imageUrl: center.imageUrl || '',
    gallery: [...(center.gallery || [])], hours: center.hours ? { ...center.hours } : { weekStart: '', weekEnd: '', fridayStart: '', fridayEnd: '' },
    coordinates: center.coordinates || null, locationConfirmed: center.locationConfirmed === true,
  }));
  const [latitude, setLatitude] = useState(String(center.coordinates?.latitude ?? ''));
  const [longitude, setLongitude] = useState(String(center.coordinates?.longitude ?? ''));
  const [confirmed, setConfirmed] = useState(center.locationConfirmed === true);
  const [locationTouched, setLocationTouched] = useState(false);
  const [accuracy, setAccuracy] = useState(null);
  const [suggestion, setSuggestion] = useState(null);
  const [locationMessage, setLocationMessage] = useState('');
  const [locationBusy, setLocationBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fields, setFields] = useState({});
  const [feedback, setFeedback] = useState(null);
  const request = useRef(0);
  const formRef = useRef(null);
  useEffect(() => () => { request.current += 1; }, []);
  useEffect(() => {
    if (!busy && Object.keys(fields).length) formRef.current?.querySelector('[aria-invalid="true"]')?.focus();
  }, [fields, busy]);
  const disabled = busy || uploading || locationBusy;
  const set = (key, value) => { setValues(current => ({ ...current, [key]: value })); setFeedback(null); };
  const field = (key, props = {}) => <FormField id={`information-${key}`} label={tr(key)} value={values[key]} onChange={value => set(key, value)} disabled={disabled} error={fields[key] && tr(`error.${fields[key]}`)} {...props} />;
  function editCoordinate(setter, value) {
    request.current += 1;
    setter(value); setConfirmed(false); setLocationTouched(true); setSuggestion(null); setAccuracy(null); setLocationMessage('');
  }
  async function locate() {
    const token = ++request.current;
    setLocationBusy(true); setLocationMessage(''); setSuggestion(null);
    try {
      const result = await locateCenterDevice();
      if (token !== request.current) return;
      setLatitude(String(result.coordinates.latitude)); setLongitude(String(result.coordinates.longitude));
      setAccuracy(result.accuracy); setConfirmed(false); setLocationTouched(true);
      setLocationMessage('remaining.reviewCoordinates');
    } catch (error) {
      if (token === request.current) setLocationMessage(`remaining.location.${error.code || 'failed'}`);
    } finally { if (token === request.current) setLocationBusy(false); }
  }
  async function lookup() {
    const coordinates = { latitude: Number(latitude), longitude: Number(longitude) };
    if (!latitude.trim() || !longitude.trim() || !validCoordinates(coordinates)) { setLocationMessage('remaining.invalidCoordinates'); return; }
    const token = ++request.current;
    const lookupLanguage = language;
    setLocationBusy(true); setLocationMessage(''); setSuggestion(null);
    try {
      const address = await lookupCenterAddress(coordinates, { language: lookupLanguage });
      if (token !== request.current) return;
      setSuggestion(address ? { address, language: lookupLanguage } : null);
      setLocationMessage(address ? 'remaining.reviewAddress' : 'remaining.location.lookupUnavailable');
    } catch (error) {
      if (token === request.current) setLocationMessage(`remaining.location.${error.code || 'lookupFailed'}`);
    } finally { if (token === request.current) setLocationBusy(false); }
  }
  async function upload(event, gallery = false) {
    const files = [...(event.target.files || [])]; event.target.value = '';
    if (!files.length) return;
    setUploading(true); setFeedback(null);
    try {
      const urls = await Promise.all(files.map(file => prepareCenterImage(file)));
      setValues(current => ({ ...current, ...(gallery ? { gallery: [...new Set([...current.gallery, ...urls])] } : { imageUrl: urls[0] }) }));
    } catch (error) { setFeedback({ error: true, text: tr(`error.${error.code || 'image'}`) }); }
    finally { setUploading(false); }
  }
  async function save(event) {
    event.preventDefault(); if (disabled) return;
    setFields({}); setFeedback(null);
    const invalid = {};
    const submitted = { ...values };
    // Preserve legacy coordinates until the center explicitly confirms or replaces them.
    delete submitted.coordinates; delete submitted.locationConfirmed;
    if (locationTouched || confirmed) {
      if (!latitude.trim() && !longitude.trim()) { submitted.coordinates = null; submitted.locationConfirmed = false; }
      else if (!latitude.trim() || !longitude.trim() || !validCoordinates({ latitude: Number(latitude), longitude: Number(longitude) })) invalid.coordinates = 'coordinates';
      else if (!confirmed) invalid.coordinates = 'confirmLocation';
      else { submitted.coordinates = { latitude: Number(latitude), longitude: Number(longitude) }; submitted.locationConfirmed = true; }
    }
    if (!Object.values(submitted.hours).some(Boolean)) submitted.hours = null;
    if (Object.keys(invalid).length) { setFields(invalid); setFeedback({ error: true, text: tr(`error.${invalid.coordinates}`) }); return; }
    setBusy(true);
    try {
      await saveCenterInformation(actor, submitted);
      setFeedback({ text: tr('saved') });
    } catch (error) { setFields(error.fields || {}); setFeedback({ error: true, text: tr(`error.${error.code || 'network'}`) }); }
    finally { setBusy(false); }
  }
  return <form ref={formRef} onSubmit={save} noValidate className="remaining-information-form">
    <div className="center-form-grid">
      {field('name', { required: true, dir: 'ltr' })}{field('nameAr', { dir: 'rtl' })}
      {field('email', { type: 'email', required: true, dir: 'ltr' })}{field('phone', { type: 'tel', required: true, dir: 'ltr' })}
      {field('about', { as: 'textarea', rows: 3, dir: 'ltr' })}{field('aboutAr', { as: 'textarea', rows: 3, dir: 'rtl' })}
    </div>
    <fieldset className="remaining-fieldset"><legend>{tr('location')}</legend>
      <div className="center-form-grid">{field('address', { required: true, dir: 'ltr' })}{field('addressAr', { dir: 'rtl' })}
        <FormField id="center-latitude" label={tr('remaining.latitude')} value={latitude} onChange={value => editCoordinate(setLatitude, value)} disabled={disabled} dir="ltr" error={fields.coordinates && tr(`error.${fields.coordinates}`)} />
        <FormField id="center-longitude" label={tr('remaining.longitude')} value={longitude} onChange={value => editCoordinate(setLongitude, value)} disabled={disabled} dir="ltr" />
      </div>
      <div className="center-actions remaining-location-actions"><Button variant="outline" onClick={locate} disabled={disabled}>{tr('remaining.useLocation')}</Button><Button variant="ghost" onClick={lookup} disabled={disabled || !latitude || !longitude}>{tr('remaining.lookupAddress')}</Button></div>
      {locationBusy && <p role="status">{tr('loading')}</p>}
      {locationMessage && <Feedback>{tr(locationMessage)}</Feedback>}
      {Number.isFinite(accuracy) && <p className="remaining-help">{tr('remaining.accuracy', { metres: Math.round(accuracy) })} {accuracy > 100 && tr('remaining.lowAccuracy')}</p>}
      {suggestion && <div className="remaining-address-suggestion"><p dir="auto">{suggestion.address}</p><Button variant="outline" disabled={disabled} onClick={() => { set(suggestion.language === 'ar' ? 'addressAr' : 'address', suggestion.address); setSuggestion(null); }}>{tr('remaining.useAddress')}</Button></div>}
      {(latitude || longitude) && <label className="remaining-check"><input type="checkbox" checked={confirmed} disabled={disabled} onChange={event => { setConfirmed(event.target.checked); setLocationTouched(true); }} /><span>{tr('remaining.confirmClinic')}</span></label>}
      <p className="remaining-help">{tr('remaining.locationHelp')}</p>
    </fieldset>
    <fieldset className="remaining-fieldset"><legend>{tr('workingHours')}</legend><div className="center-form-grid">{['weekStart', 'weekEnd', 'fridayStart', 'fridayEnd'].map(key => <FormField key={key} type="time" label={tr(key)} value={values.hours[key]} disabled={disabled} onChange={value => set('hours', { ...values.hours, [key]: value })} />)}</div></fieldset>
    <fieldset className="remaining-fieldset"><legend>{tr('remaining.images')}</legend>
      <div className="remaining-profile-upload"><RecordImage src={values.imageUrl} alt={tr('profileImage')} /><label className="center-upload remaining-file-control">{tr('changePhoto')}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled} onChange={event => upload(event)} /><small>{tr('imageHelp')}</small></label></div>
      <div className="remaining-gallery-edit">{values.gallery.map((src, index) => <div key={src}><RecordImage src={src} alt={tr('centerPhoto', { count: index + 1 })} /><Button variant="ghost" disabled={disabled} aria-label={tr('remaining.removePhoto', { count: index + 1 })} onClick={() => set('gallery', values.gallery.filter(value => value !== src))}>{tr('remaining.remove')}</Button></div>)}</div>
      <label className="center-upload remaining-file-control">{tr('addPhoto')}<input type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={disabled} onChange={event => upload(event, true)} /></label>
      {uploading && <p role="status">{tr('loading')}</p>}
    </fieldset>
    <Feedback error={feedback?.error}>{feedback?.text}</Feedback>
    <Button type="submit" loading={busy} disabled={uploading || locationBusy}>{tr('saveChanges')}</Button>
  </form>;
}
