import { useEffect, useState } from 'react';
import { faSliders } from '@fortawesome/free-solid-svg-icons';
import Button from '../shared/Button/Button.jsx';
import Modal from '../shared/Modal/Modal.jsx';
import FormField from '../shared/FormField/FormField.jsx';
import SearchBar from '../shared/SearchBar/SearchBar.jsx';
import { SelectField } from './CenterUI.jsx';
import useCenter from './useCenter.js';

const defaults = { therapist: '', service: '', sort: 'asc' };

function SecondaryFilters({ values, onChange, prefix }) {
  const { data, name, tr } = useCenter();
  const options = {
    therapist: [{ value: '', label: tr('allTherapists') }, ...data.therapists.map(item => ({ value: item.id, label: name(item.name) }))],
    service: [{ value: '', label: tr('allServices') }, ...data.services.map(item => ({ value: item.id, label: name(item.name) }))],
    sort: [{ value: 'asc', label: tr('dateAscending') }, { value: 'desc', label: tr('dateDescending') }],
  };
  return ['therapist', 'service', 'sort'].map(key => <SelectField key={key}
    id={`${prefix}-${key}`} label={tr({ therapist: 'therapistId', service: 'serviceId', sort: 'sort' }[key])}
    value={values[key]} options={options[key]} onChange={value => onChange({ ...values, [key]: value })} />);
}

function FilterPanel({ values, onApply, onClear, onClose }) {
  const { tr, dir } = useCenter();
  const [draft, setDraft] = useState(values);
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1200px)');
    const change = event => { if (event.matches) onClose(); };
    desktop.addEventListener('change', change);
    return () => desktop.removeEventListener('change', change);
  }, [onClose]);
  return <Modal className="center-modal center-filter-panel" isOpen title={tr('filters')} dir={dir} onClose={onClose} footer={<>
    <Button variant="outline" onClick={() => { setDraft(defaults); onClear(defaults); }}>{tr('clearFilters')}</Button>
    <Button onClick={() => onApply(draft)}>{tr('applyFilters')}</Button>
  </>}><div className="center-filter-panel__fields"><SecondaryFilters values={draft} onChange={setDraft} prefix="panel" /></div></Modal>;
}

export default function AppointmentFilters({ query, onQuery, month, onMonth, values, onChange, status, onStatus, statuses }) {
  const { tr } = useCenter();
  const [open, setOpen] = useState(false);
  const count = Number(Boolean(values.therapist)) + Number(Boolean(values.service)) + Number(values.sort !== 'asc');
  return <>
    <div className="center-appointments__toolbar">
      <div className="center-appointments__search"><span className="center-appointments__label">{tr('search')}</span><SearchBar value={query} onChange={onQuery} placeholder={tr('searchPatients')} ariaLabel={tr('searchPatients')} /></div>
      <div className="center-appointments__month"><FormField id="appointments-month" label={tr('month')} type="month" value={month} onChange={onMonth} /></div>
      <div className="center-appointments__desktop-filters"><SecondaryFilters values={values} onChange={onChange} prefix="desktop" /></div>
      <Button className="center-appointments__filter-toggle" variant="outline" icon={faSliders} aria-haspopup="dialog" onClick={() => setOpen(true)}>{tr('filters')}{count > 0 && <span className="center-appointments__filter-count">{count}</span>}</Button>
    </div>
    <div className="center-tabs center-appointments__statuses" role="group" aria-label={tr('appointmentStatus')}>
      {statuses.map(({ value, label }) => <button key={value} type="button" aria-pressed={status === value} onClick={() => onStatus(value)}>{label}</button>)}
    </div>
    {open && <FilterPanel values={values} onClose={() => setOpen(false)} onClear={onChange} onApply={next => { onChange(next); setOpen(false); }} />}
  </>;
}
