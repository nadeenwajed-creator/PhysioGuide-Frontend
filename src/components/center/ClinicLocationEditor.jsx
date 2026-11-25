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
  // Names one point in both languages so the English and Arabic address
  // fields can be filled together.
  async function bilingualAddress(point, fallback = null) {
    const [english, arabic] = await Promise.allSettled([
      lookupCenterAddress(point, { language: 'en' }),
      lookupCenterAddress(point, { language: 'ar' }),
    ]);
    const en = (english.status === 'fulfilled' ? english.value : null) || fallback;
    const ar = (arabic.status === 'fulfilled' ? arabic.value : null) || fallback;
    return en || ar ? { en, ar } : null;
  }
  async function selectPoint(point, locate = false) {
    const token = ++request.current;
    loading(true); setMessage(''); setResults([]);
    try {
      const selected = locate ? (await locateCenterDevice()).coordinates : point;
      if (token !== request.current) return;
      onChange({ coordinates: selected });
      try {
        // "Use my location" fills both the English and the Arabic address.
        if (locate) {
          const addresses = await bilingualAddress(selected);
          if (token === request.current && addresses) onChange({ coordinates: selected, addresses });
          return;
        }
        const resolved = await lookupCenterAddress(selected, { language });
        if (token === request.current && resolved) onChange({ coordinates: selected, address: resolved, language });
      } catch { /* A failed address lookup must not discard the selected pin. */ }
    } catch (error) { if (token === request.current) setMessage(`center.remaining.location.${error.code || 'failed'}`); }
    finally { if (token === request.current) loading(false); }
  }
  // Selecting a search result fills both address fields from its coordinates.
  async function selectSearchResult(result) {
    const token = ++request.current;
    loading(true); setResults([]); setMessage('');
    try {
      onChange({ coordinates: result.coordinates });
      const addresses = await bilingualAddress(result.coordinates, result.address);
      if (token === request.current && addresses) onChange({ coordinates: result.coordinates, addresses });
    } catch { /* A failed address lookup must not discard the selected pin. */ }
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
    {results.length > 0 && <div className="clinic-location-editor__results">{results.map((result, index) => <Button key={index} variant="outline" disabled={pending} onClick={() => selectSearchResult(result)}>{result.address}</Button>)}</div>}
    <ClinicMap coordinates={coordinates} disabled={pending} onChange={point => selectPoint(point)} />
    <label className="clinic-location-editor__confirm"><input type="checkbox" checked={confirmed} disabled={pending || !validCoordinates(coordinates)} aria-invalid={!!invalid} onChange={event => onConfirm(event.target.checked)} /><span>{t('center.remaining.confirmClinic')}</span></label>
    {invalid && <p className="clinic-location-editor__error" role="alert">{t('center.error.confirmLocation')}</p>}
  </div>;
}
