import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faImage, faArrowRight, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import Button from '../shared/Button/Button.jsx';
import Modal from '../shared/Modal/Modal.jsx';
import Pagination from '../shared/Pagination/Pagination.jsx';
import FormField from '../shared/FormField/FormField.jsx';
import FilterSelect from '../shared/FilterSelect/FilterSelect.jsx';
import StatusBadge from '../shared/StatusBadge/StatusBadge.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { pageSizes } from './usePagination.js';
import './CenterUI.css';
export function PageHeader({
  title,
  description,
  children
}) {
  return <header className="center-page-header">
    <div>
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
    {children && <div className="center-actions">{children}</div>}
  </header>;
}
export function Panel({
  title,
  action,
  children,
  className = ''
}) {
  return <section className={`center-panel ${className}`}>
    {(title || action) && <div className="center-panel__heading">
      <h2>{title}</h2>
      {action}
    </div>}
    {children}
  </section>;
}
export function PageLink({
  to,
  children
}) {
  const {
    dir
  } = useLanguage();
  return <Link className="center-link" to={to}>
    {children}
    <FontAwesomeIcon icon={dir === 'rtl' ? faArrowLeft : faArrowRight} aria-hidden="true" />
  </Link>;
}
export function EmptyState({
  children
}) {
  return <p className="center-empty" role="status">{children}</p>;
}
export function Feedback({
  error,
  children,
  onDismiss,
  resetKey
}) {
  return children ? <FeedbackMessage key={`${Boolean(error)}:${children}`} error={error} onDismiss={onDismiss} resetKey={resetKey}>{children}</FeedbackMessage> : null;
}

function FeedbackMessage({ error, children, onDismiss, resetKey }) {
  const token = resetKey ?? children;
  const [expired, setExpired] = useState(null);
  const dismissRef = useRef(onDismiss);
  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);
  useEffect(() => {
    // Success notices expire; errors stay visible until the user addresses them.
    if (error) return;
    const timer = window.setTimeout(() => {
      setExpired(token);
      dismissRef.current?.();
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [error, token]);
  return error || expired !== token ? <p className={`center-feedback${error ? ' center-feedback--error' : ''}`} role={error ? 'alert' : 'status'}>{children}</p> : null;
}
export function RecordStatus({
  value
}) {
  const {
    t
  } = useLanguage();
  if (['confirmed', 'pending', 'completed', 'cancelled'].includes(value)) return <StatusBadge status={value} />;
  // Staff/patient states are page-owned, not unsupported StatusBadge variants.
  return <span className={`center-record-status center-record-status--${value}`}>{t(`center.${value}`)}</span>;
}
export function RecordImage({
  src,
  alt,
  className = ''
}) {
  const [failedSrc, setFailedSrc] = useState(null);
  return src && failedSrc !== src ? <img className={`center-record-image ${className}`} src={src} alt={alt} loading="lazy" onError={() => setFailedSrc(src)} /> : <div className={`center-record-image center-record-image--fallback ${className}`} role="img" aria-label={alt}><FontAwesomeIcon icon={faImage} aria-hidden="true" /></div>;
}
export function SelectField({
  label,
  error,
  ...props
}) {
  return <div className="center-select-field">
    <label htmlFor={props.id}>{label}{props.required && <span aria-hidden="true"> *</span>}</label>
    <FilterSelect {...props} ariaLabel={label} />
    {error && <span role="alert">{error}</span>}
  </div>;
}
export function Pager({
  page,
  total,
  onChange,
  pageSize,
  onPageSizeChange
}) {
  const { t, language } = useLanguage();
  const id = useId();
  const number = new Intl.NumberFormat(language);
  const pages = Math.ceil(total / pageSize);
  return <div className="center-pagination">
    <div className="center-pagination__size">
      <label htmlFor={id}>{t('center.rowsPerPage')}</label>
      <FilterSelect id={id} ariaLabel={t('center.rowsPerPage')} value={String(pageSize)}
        onChange={onPageSizeChange} options={pageSizes.map(value => ({ value: String(value), label: number.format(value) }))} />
    </div>
    <span className="center-pagination__range" role="status">{t('center.visibleRange', {
      start: number.format(total ? (page - 1) * pageSize + 1 : 0),
      end: number.format(Math.min(page * pageSize, total)), total: number.format(total),
    })}</span>
    {pages > 1 && <Pagination currentPage={Math.min(page, pages)} totalPages={pages} onPageChange={onChange} />}
  </div>;
}
export function ConfirmDialog({
  title,
  description,
  onClose,
  onConfirm,
  danger = false
}) {
  const {
    t,
    dir
  } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function confirm() {
    setBusy(true);
    setError('');
    try {
      await onConfirm();
      onClose();
    } catch (failure) {
      setError(t(`center.error.${failure.code || 'network'}`));
    } finally {
      setBusy(false);
    }
  }
  return <Modal className="center-modal" isOpen title={title} dir={dir} onClose={busy ? undefined : onClose} footer={<>
      <Button variant="outline" disabled={busy} onClick={onClose}>{t('center.cancel')}</Button>
      <Button variant={danger ? 'danger' : 'primary'} loading={busy} onClick={confirm}>{t('center.confirm')}</Button>
    </>}>
    <p>{description}</p>
    <Feedback error>{error}</Feedback>
  </Modal>;
}
export function TextDialog({
  title,
  label,
  initialValue = '',
  onClose,
  onSave
}) {
  const {
    t,
    dir
  } = useLanguage();
  const [value, setValue] = useState(initialValue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    if (!value.trim()) {
      setError(t('center.error.required'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onSave(value.trim());
      onClose();
    } catch (failure) {
      setError(t(`center.error.${failure.code || 'network'}`));
    } finally {
      setBusy(false);
    }
  }
  return <Modal className="center-modal" isOpen title={title} dir={dir} onClose={busy ? undefined : onClose} footer={<>
      <Button variant="outline" disabled={busy} onClick={onClose}>{t('center.cancel')}</Button>
      <Button type="submit" form="center-text-form" loading={busy}>{t('center.save')}</Button>
    </>}><form id="center-text-form" onSubmit={submit} noValidate>
      <FormField label={label} as="textarea" required value={value} onChange={setValue} disabled={busy} />
      <Feedback error>{error}</Feedback>
    </form></Modal>;
}
