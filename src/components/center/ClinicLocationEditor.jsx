import { useEffect, useRef, useState } from 'react';
import Button from '../shared/Button/Button.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import ClinicMap from './ClinicMap.jsx';
import { locateCenterDevice, lookupCenterAddress, searchCenterAddress, validCoordinates } from '../../services/centerLocationService.js';
import './ClinicLocationEditor.css';

export default function ClinicLocationEditor({ address, coordinates, confirmed, onChange, onConfirm, onBusyChange, disabled, invalid }) {
  const { t, language } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState([]);
  const [message, setMessage] = useState('');
  const request = useRef(0);
  useEffect(() => () => { request.current++; }, []);
  const pending = disabled || busy;
  function loading(value) { setBusy(value); onBusyChange?.(value); }
  async function selectPoint(point, locate = false) {
    const token = ++request.current;
    loading(true); setMessage(''); setResults([]);
    try {
      const selected = locate ? (await locateCenterDevice()).coordinates : point;
      if (token !== request.current) return;
      onChange({ coordinates: selected });
      try {
        const resolved = await lookupCenterAddress(selected, { language });
        if (token === request.current && resolved) onChange({ coordinates: selected, address: resolved, language });
      } catch { /* A failed address lookup must not discard the selected pin. */ }
    } catch (error) { if (token === request.current) setMessage(`center.remaining.location.${error.code || 'failed'}`); }
    finally { if (token === request.current) loading(false); }
  }
  async function search() {
    const token = ++request.current;
    loading(true); setResults([]); setMessage('');
    try {
      const matches = await searchCenterAddress(address, { language });
      if (token !== request.current) return;
      setResults(matches);
      if (!matches.length) setMessage('center.remaining.noAddressResults');
    } catch (error) { if (token === request.current) setMessage(`center.remaining.location.${error.code || 'lookupFailed'}`); }
    finally { if (token === request.current) loading(false); }
  }
  return <div className="clinic-location-editor">
    <div className="clinic-location-editor__actions">
      <Button variant="outline" disabled={pending} onClick={() => selectPoint(null, true)}>{t('center.remaining.useLocation')}</Button>
      <Button variant="outline" disabled={pending || !address?.trim()} onClick={search}>{t('center.remaining.searchMap')}</Button>
    </div>
    {busy && <p role="status">{t('center.loading')}</p>}
    {message && <p role="status">{t(message)}</p>}
    {results.length > 0 && <div className="clinic-location-editor__results">{results.map((result, index) => <Button key={index} variant="outline" disabled={pending} onClick={() => {
      onChange({ ...result, language }); setResults([]); setMessage('');
    }}>{result.address}</Button>)}</div>}
    <ClinicMap coordinates={coordinates} disabled={pending} onChange={point => selectPoint(point)} />
    <label className="clinic-location-editor__confirm"><input type="checkbox" checked={confirmed} disabled={pending || !validCoordinates(coordinates)} aria-invalid={!!invalid} onChange={event => onConfirm(event.target.checked)} /><span>{t('center.remaining.confirmClinic')}</span></label>
    {invalid && <p className="clinic-location-editor__error" role="alert">{t('center.error.confirmLocation')}</p>}
  </div>;
}
