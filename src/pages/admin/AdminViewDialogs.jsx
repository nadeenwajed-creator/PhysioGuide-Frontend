import { useState } from 'react';
import Avatar from '../../components/shared/Avatar/Avatar.jsx';
import Button from '../../components/shared/Button/Button.jsx';
import Modal from '../../components/shared/Modal/Modal.jsx';
import { EmptyState, RecordStatus } from '../../components/center/CenterUI.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { formatDate, money } from '../../utils/centerFormat.js';
import useAdminQuery, { errorText } from './useAdminQuery.js';
import './AdminViewDialogs.css';
// The admin patient view is the center one without the medical notes tab, so
// it reuses that dialog's layout and its patient-details styles.
import '../../components/center/PatientDetails.css';

const value = (input) => (input == null || input === '' ? '—' : input);
const dateOf = (input) => (input ? String(input).slice(0, 10) : '');
const timeOf = (input) => (input ? String(input).slice(11, 16) : '');

// Appointment slots arrive as local wall-clock text, so the parts are formatted
// by hand instead of through a UTC conversion.
const dateLabel = (input, language) => (dateOf(input) ? formatDate(dateOf(input), language) : '—');
const timeRange = (start, end) => {
  const from = timeOf(start);
  const to = timeOf(end);
  return from && to ? `${from} – ${to}` : from || '—';
};

function minutesBetween(start, end) {
  const from = dateOf(start) && timeOf(start) ? new Date(`${dateOf(start)}T${timeOf(start)}:00`) : null;
  const to = dateOf(end) && timeOf(end) ? new Date(`${dateOf(end)}T${timeOf(end)}:00`) : null;
  if (!from || !to) return 0;
  const minutes = Math.round((to.getTime() - from.getTime()) / 60000);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : 0;
}

function StatusPill({ status }) {
  const { t } = useLanguage();
  if (!status) return null;
  return <span className={`admin-badge admin-badge--${status}`}>{t(`admin.status.${status}`)}</span>;
}

function ViewModal({ title, onClose, children }) {
  const { t } = useLanguage();
  return (
    <Modal
      isOpen
      size="lg"
      title={title}
      onClose={onClose}
      footer={
        <Button variant="outline" onClick={onClose}>
          {t('center.close')}
        </Button>
      }
    >
      <div className="admin-view">{children}</div>
    </Modal>
  );
}

// The identity block the center pages open their patient dialog with: photo,
// name and contact on one line, status and record id on the other.
function ViewHeader({ imageUrl, name, email, seed, gender, status, subtitle, id }) {
  return (
    <header className="admin-view__header">
      <Avatar src={imageUrl} name={name} email={email} seed={seed} gender={gender} size="lg" />
      <div className="admin-view__who">
        <h2>{value(name)}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
        {email ? (
          <p className="admin-view__muted">
            <bdi>{email}</bdi>
          </p>
        ) : null}
      </div>
      <div className="admin-view__meta">
        <StatusPill status={status} />
        <span className="admin-view__id">#{id}</span>
      </div>
    </header>
  );
}

function ViewSection({ title, rows }) {
  if (!rows.length) return null;
  return (
    <section className="admin-view__section">
      {title ? <h3>{title}</h3> : null}
      <dl className="admin-record">
        {rows.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>{value(row.value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function StateMessage({ state, onRetry, children }) {
  const { t } = useLanguage();
  if (state.error) {
    return (
      <div className="admin-view__state">
        <p>{errorText(t, state.error)}</p>
        <Button variant="outline" onClick={onRetry ?? state.reload}>
          {t('admin.state.retry')}
        </Button>
      </div>
    );
  }
  if (state.loading) {
    return (
      <p className="admin-view__muted" role="status">
        {t('admin.state.loading')}
      </p>
    );
  }
  return children;
}

export function PatientViewDialog({ patient, onClose, onEdit }) {
  const { t, language } = useLanguage();
  const [tab, setTab] = useState('overview');
  const detailState = useAdminQuery('getAdminPatient', { id: patient.id });
  const historyState = useAdminQuery('getAdminAppointments', {
    patientId: patient.id,
    page: 1,
    pageSize: 50,
  });
  const profile = detailState.data || {};
  const history = historyState.data?.items || [];
  const name = profile.name || patient.name;
  const gender = profile.gender || patient.gender;
  const status = profile.status || patient.status;
  const lastVisit = history[0]?.datetime;
  const number = new Intl.NumberFormat(language);
  const total = historyState.data?.total ?? patient.appointments ?? history.length;
  const genderLabel = ['male', 'female', 'other'].includes(gender) ? t(`center.${gender}`) : gender || '—';
  return (
    <Modal
      className="center-modal"
      isOpen
      size="lg"
      title={t('center.patientDetails')}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('center.close')}
          </Button>
          {onEdit ? <Button onClick={onEdit}>{t('admin.records.editPatient')}</Button> : null}
        </>
      }
    >
      <div className="center-identity center-patient-details__identity">
        <Avatar
          src={profile.imageUrl || patient.imageUrl}
          name={name}
          email={profile.email || patient.email}
          seed={patient.id}
          gender={gender}
          size="lg"
        />
        <div>
          <h3>{value(name)}</h3>
          <p>
            <bdi>{value(profile.phone || patient.phone)}</bdi>
          </p>
          <p>
            <bdi>{value(profile.email || patient.email)}</bdi>
          </p>
        </div>
      </div>
      <div className="center-tabs" aria-label={t('center.patientDetails')}>
        {['overview', 'appointments'].map((key) => (
          <button key={key} type="button" aria-pressed={tab === key} onClick={() => setTab(key)}>
            {t(`center.${key}`)}
          </button>
        ))}
      </div>
      {tab === 'overview' ? (
        <>
          <dl className="center-detail-list center-patient-details__summary">
            <div>
              <dt>{t('center.birthDate')}</dt>
              <dd>{formatDate(profile.dateOfBirth, language)}</dd>
            </div>
            <div>
              <dt>{t('center.gender')}</dt>
              <dd>{genderLabel}</dd>
            </div>
            <div>
              <dt>{t('center.status')}</dt>
              <dd>
                <RecordStatus value={status} />
              </dd>
            </div>
          </dl>
          <dl className="center-detail-list center-patient-details__visits">
            <div>
              <dt>{t('center.totalAppointments')}</dt>
              <dd>{number.format(total)}</dd>
            </div>
            <div>
              <dt>{t('center.lastVisit')}</dt>
              <dd>{lastVisit ? formatDate(dateOf(lastVisit), language) : t('center.noPreviousVisits')}</dd>
            </div>
          </dl>
        </>
      ) : (
        <div className="center-patient-details__history">
          <h3>{t('center.appointmentHistory')}</h3>
          {history.length ? (
            history.map((item) => (
              <article key={item.id}>
                <div>
                  <time>
                    {formatDate(dateOf(item.datetime), language)} · <bdi>{timeOf(item.datetime)}</bdi>
                  </time>
                  <strong>{value(item.service)}</strong>
                  <small>{value(item.therapist)}</small>
                </div>
                <RecordStatus value={item.status} />
              </article>
            ))
          ) : (
            <EmptyState>{t('center.noAppointments')}</EmptyState>
          )}
        </div>
      )}
    </Modal>
  );
}

export function AppointmentViewDialog({ appointment, onClose }) {
  const { t, language } = useLanguage();
  const duration = minutesBetween(appointment.datetime, appointment.endDateTime);
  const reason = appointment.cancellationReason || appointment.rejectionReason;
  const reasonLabel = appointment.cancellationReason
    ? t('admin.view.cancellationReason')
    : t('admin.view.rejectionReason');
  return (
    <ViewModal title={t('admin.view.appointmentTitle')} onClose={onClose}>
      <ViewHeader
        imageUrl={appointment.patientImage}
        name={appointment.patient}
        seed={appointment.patientId || appointment.id}
        status={appointment.status}
        subtitle={[appointment.service, appointment.center].filter(Boolean).join(' · ')}
        id={appointment.id}
      />
      <ViewSection
        rows={[
          { label: t('admin.appointments.patient'), value: appointment.patient },
          { label: t('admin.appointments.center'), value: appointment.center },
          { label: t('admin.appointments.therapist'), value: appointment.therapist },
          { label: t('admin.appointments.service'), value: appointment.service },
          { label: t('admin.records.dateTime'), value: dateLabel(appointment.datetime, language) },
          { label: t('admin.view.time'), value: timeRange(appointment.datetime, appointment.endDateTime) },
          {
            label: t('admin.view.duration'),
            value: duration ? t('admin.view.minutes', { count: duration }) : '—',
          },
          {
            label: t('admin.view.price'),
            value: appointment.price != null ? money(appointment.price, language, 'ILS') : '—',
          },
          { label: t('admin.view.created'), value: dateLabel(appointment.createdAt, language) },
        ]}
      />
      {appointment.notes ? (
        <ViewSection title={t('admin.records.notes')} rows={[{ label: t('admin.records.notes'), value: appointment.notes }]} />
      ) : null}
      {reason ? <ViewSection title={reasonLabel} rows={[{ label: reasonLabel, value: reason }]} /> : null}
    </ViewModal>
  );
}

export function TherapistViewDialog({ therapist, onClose }) {
  const { t, language } = useLanguage();
  const detailState = useAdminQuery('getAdminPhysiotherapist', { id: therapist.id });
  const profile = { ...therapist, ...(detailState.data || {}) };
  return (
    <ViewModal title={t('admin.view.therapistTitle')} onClose={onClose}>
      <ViewHeader
        imageUrl={profile.imageUrl}
        name={profile.name}
        email={profile.email}
        seed={therapist.id}
        status={profile.status}
        subtitle={profile.specialty ? `${profile.specialty} · ${value(profile.center)}` : value(profile.center)}
        id={therapist.id}
      />
      <StateMessage state={detailState}>
        <ViewSection
          rows={[
            { label: t('admin.view.license'), value: profile.license },
            { label: t('admin.records.specialty'), value: profile.specialty },
            { label: t('admin.records.center'), value: profile.center },
            { label: t('admin.records.email'), value: profile.email },
            { label: t('admin.records.phone'), value: profile.phone },
            { label: t('admin.view.experience'), value: profile.yearsOfExperience === '' || profile.yearsOfExperience == null ? '' : t('admin.view.years', { count: profile.yearsOfExperience }) },
            { label: t('admin.view.availability'), value: profile.isAvailable === false ? t('admin.view.unavailable') : t('admin.records.available') },
            {
              label: t('admin.view.rating'),
              value: profile.rating == null ? '' : `${profile.rating}${profile.reviews != null ? ` · ${t('admin.view.reviews', { count: profile.reviews })}` : ''}`,
            },
            { label: t('admin.records.joined'), value: dateLabel(profile.joinedAt, language) },
          ]}
        />
        {profile.bio ? (
          <ViewSection title={t('admin.records.bio')} rows={[{ label: t('admin.records.bio'), value: profile.bio }]} />
        ) : null}
      </StateMessage>
    </ViewModal>
  );
}
