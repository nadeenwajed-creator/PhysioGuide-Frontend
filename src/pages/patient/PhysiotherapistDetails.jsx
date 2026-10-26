import { usePatientLabels } from '../../components/patient/usePatientLabels.js';
import { useCallback, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarCheck,
  faComments,
  faGraduationCap,
  faChevronRight
} from '@fortawesome/free-solid-svg-icons';
import Button from '../../components/shared/Button/Button.jsx';
import RatingStars from '../../components/shared/RatingStars/RatingStars.jsx';
import { Panel, RecordImage, Feedback } from '../../components/center/CenterUI.jsx';
import useDiscovery from '../../components/patient/useDiscovery.js';
import { DiscoveryState } from '../../components/patient/DiscoveryUI.jsx';
import { openPatientConversation } from '../../services/patientDiscoveryService.js';
import AppointmentDates from '../../components/patient/AppointmentDates.jsx';
import TimeRail from '../../components/patient/TimeRail.jsx';
import usePatientAvailability from '../../components/patient/usePatientAvailability.js';
import BookingModal from '../../components/patient/BookingModal.jsx';
import '../../components/patient/PatientDiscovery.css';

function Details({ state, center, person }) {
  const { t, name, money } = usePatientLabels();
  const navigate = useNavigate();
  // Only show services assigned to this therapist at this center
  const services = center.services.filter(s => (person.serviceIds || []).includes(s.id));
  const [serviceChoice, setService] = useState(services[0]?.id || '');
  // Fall back if a data refresh removes the selected service
  const serviceId = services.some(s => s.id === serviceChoice) ? serviceChoice : services[0]?.id || '';
  const [date, setDate] = useState(() => {
    const now = new Date();
    // Offset before converting to ISO so the initial date is today locally
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  });
  const [time, setTime] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [booking, setBooking] = useState(false);
  const service = services.find(s => s.id === serviceId);
  // Drop the selected time if refreshed availability no longer includes it
  const reconcileTime = useCallback(slots => setTime(current => slots.includes(current) ? current : ''), [setTime]);
  const { slots, loading, error: availabilityError } = usePatientAvailability(state.actor, {
    centerId: center.id,
    therapistId: person.id,
    serviceId,
    date
  }, center, reconcileTime);
  const selectedTime = slots.includes(time) ? time : '';
  return <>
    <nav className="pd-breadcrumb" aria-label={t('centers')}>
      <Link to="/patient/centers">
        {t('centers')}
      </Link>
      <FontAwesomeIcon className="pd-chevron" icon={faChevronRight} />
      <Link to={`/patient/centers/${encodeURIComponent(center.id)}`}>
        {name(center.name)}
      </Link>
      <FontAwesomeIcon className="pd-chevron" icon={faChevronRight} />
      <span>{name(person.name)}</span>
    </nav>
    <div className="pd-therapist-top">
      <Panel className="pd-professional">
        <RecordImage src={person.imageUrl} alt={name(person.name)} />
        <div className="pd-professional-summary">
          <p className="pd-eyebrow">{name(person.specialty)}</p>
          <h1>{name(person.name)}</h1>
          <div className="pd-rating">
            {Number.isFinite(person.rating) && <RatingStars rating={person.rating} showValue />}
            {Number.isFinite(person.experience) && <span>
              {t('experience', {
                count: person.experience
              })}
            </span>}
          </div>
        </div>
        <div className="pd-professional-about">
          <p>{name(person.about) || t('unavailable')}</p>
          <Link to={`/patient/centers/${encodeURIComponent(center.id)}`}>
            {name(center.name)}
          </Link>
          <hr />
          <h2>{t('specializes')}</h2>
          <div className="pd-chips">
            {services.map(s => <span key={s.id}>{name(s.name)}</span>)}
          </div>
        </div>
      </Panel>
      <Panel className="pd-book-card">
        <div className="pd-book-surface">
          {service && <div className="pd-price">
            <p>{t('session')}</p>
            <strong>{money(service.price)}</strong>
            <p>
              {t('minutes', {
                count: service.duration
              })}
            </p>
          </div>}
          <div className="pd-book-actions">
            <Button
              icon={faCalendarCheck}
              fullWidth
              disabled={!services.length}
              onClick={() => setBooking(true)}
            >
              {t('book')}
            </Button>
            <Button
              icon={faComments}
              fullWidth
              variant="outline"
              loading={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  // Use the conversation returned by the service for navigation
                  const c = await openPatientConversation(state.actor, {
                    centerId: center.id,
                    therapistId: person.id
                  });
                  navigate(`/patient/messages/${encodeURIComponent(c.id)}`);
                } catch {
                  setError(t('error'));
                  setBusy(false);
                }
              }}
            >
              {t('message')}
            </Button>
          </div>
        </div>
      </Panel>
    </div>
    <div className="pd-overview">
      <Panel
        className="pd-appointments"
        title={<><FontAwesomeIcon icon={faCalendarCheck} /> {t('available')}</>}
      >
        <p>{t('choose')}</p>
        <div className="pd-chips">
          {services.map(s => <Button
            key={s.id}
            variant={serviceId === s.id ? 'primary' : 'outline'}
            aria-pressed={serviceId === s.id}
            onClick={() => {
              setService(s.id);
              setTime('');
            }}
          >
            {name(s.name)}
          </Button>)}
        </div>
        <AppointmentDates
          value={date}
          onChange={v => {
            setDate(v);
            setTime('');
          }}
        />
        <TimeRail
          key={`${person.id}:${serviceId}:${date}`}
          slots={slots}
          hours={center.hours}
          duration={service?.duration}
          date={date}
          value={selectedTime}
          onChange={setTime}
          loading={loading}
        />
        {loading && services.length > 0 && <p role="status">{t('loading')}</p>}
        {!loading && date && !slots.length && <p>{t('noSlots')}</p>}
        {selectedTime && <Button disabled={loading} onClick={() => setBooking(true)}>
          {t('book')}
        </Button>}
      </Panel>
      <Panel
        className="pd-credentials"
        title={<><FontAwesomeIcon icon={faGraduationCap} /> {t('credentials')}</>}
      >
        {person.credentials?.length ? <ul>
          {person.credentials.map((c, i) => <li key={i}>
            {name(c)}
          </li>)}
        </ul> : <p>{t('noCredentials')}</p>}
      </Panel>
    </div>
    <Feedback error>
      {error || availabilityError && t('error')}
    </Feedback>
    {booking && <BookingModal
      state={state}
      initial={{
        centerId: center.id,
        therapistId: person.id,
        serviceId,
        date,
        time: selectedTime
      }}
      onClose={() => setBooking(false)}
    />}
  </>;
}

export default function PhysiotherapistDetails() {
  const state = useDiscovery();
  const { centerId, therapistId } = useParams();
  const { t } = usePatientLabels();
  const center = state.data?.centers.find(c => c.id === centerId);
  const person = center?.therapists.find(p => p.id === therapistId);
  return <div className="pd-page">
    <DiscoveryState state={state}>
      {person
        ? <Details key={centerId + therapistId} state={state} center={center} person={person} />
        : <p>{t('notFound')}</p>}
    </DiscoveryState>
  </div>;
}
