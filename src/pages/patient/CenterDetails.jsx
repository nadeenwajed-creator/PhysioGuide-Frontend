import { usePatientLabels } from '../../components/patient/usePatientLabels.js';
import { useState } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import Button from '../../components/shared/Button/Button.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock } from '@fortawesome/free-solid-svg-icons';
import { Panel, RecordImage } from '../../components/center/CenterUI.jsx';
import useDiscovery from '../../components/patient/useDiscovery.js';
import { DiscoveryState, Favorite, CenterRating } from '../../components/patient/DiscoveryUI.jsx';
import BookingModal from '../../components/patient/BookingModal.jsx';
import CenterGallery from '../../components/patient/CenterGallery.jsx';
import ReviewsCarousel from '../../components/patient/ReviewsCarousel.jsx';
import '../../components/patient/PatientDiscovery.css';

export default function CenterDetails() {
  const state = useDiscovery();
  const { centerId } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, name, money, dir } = usePatientLabels();
  const [booking, setBooking] = useState(null);
  const c = state.data?.centers.find(c => c.id === centerId);
  const tabs = ['overview', 'services', 'therapists', 'reviews'];
  // Keep the selected tab in the link and fall back for unknown values
  const tab = tabs.includes(params.get('tab')) ? params.get('tab') : 'overview';
  return <div className="pd-page">
    <Link className="pd-back" to="/patient/centers">{`${dir === 'rtl' ? '→' : '←'} ${t('back')}`}</Link>
    <DiscoveryState state={state}>
      {c ? <>
        <CenterGallery key={c.id} center={c} />
        <header className="pd-detail-heading">
          <div>
            <h1>{name(c.name)}</h1>
            <CenterRating center={c} />
          </div>
          <div className="pd-actions">
            <Button
              onClick={() => setBooking({
                centerId
              })}
            >
              {t('book')}
            </Button>
            <Favorite center={c} state={state} />
          </div>
        </header>
        <div className="pd-tabs" role="tablist">
          {tabs.map(k => <button
            role="tab"
            id={`center-tab-${k}`}
            aria-controls="center-tab-panel"
            tabIndex={tab === k ? 0 : -1}
            onKeyDown={e => {
              // Follow the layout direction and wrap between the first and last tab
              const step = e.key === 'ArrowRight' ? dir === 'rtl' ? -1 : 1 : e.key === 'ArrowLeft' ? dir === 'rtl' ? 1 : -1 : 0;
              const index = e.key === 'Home'
                ? 0
                : e.key === 'End' ? tabs.length - 1 : step ? (tabs.indexOf(k) + step + tabs.length) % tabs.length : -1;
              if (index >= 0) {
                e.preventDefault();
                setParams({
                  tab: tabs[index]
                });
                // Keep focus on the tab that now controls the visible panel
                document.getElementById(`center-tab-${tabs[index]}`)?.focus();
              }
            }}
            aria-selected={tab === k}
            key={k}
            onClick={() => setParams({
              tab: k
            })}
          >
            {t(k)}
          </button>)}
        </div>
        <div role="tabpanel" id="center-tab-panel" aria-labelledby={`center-tab-${tab}`}>
          {tab === 'overview' && <div className="pd-overview">
            <Panel title={t('about')}>
              <p>{name(c.about) || t('unavailable')}</p>
              <div className="pd-chips">
                {c.services.map(s => <span key={s.id}>{name(s.name)}</span>)}
              </div>
            </Panel>
            <aside>
              <Panel title={t('contact')}>
                <p>
                  <a href={`tel:${c.phone}`}>
                    <bdi>{c.phone}</bdi>
                  </a>
                </p>
                <p>
                  <a href={`mailto:${c.email}`}>
                    <bdi>{c.email}</bdi>
                  </a>
                </p>
                <p>{name(c.address)}</p>
              </Panel>
              <Panel className="pd-hours" title={t('hours')}>
                {c.hours ? <>
                  <p>
                    <span>{t('week')}</span>
                    <bdi>{c.hours.weekStart}
                      –

                    {c.hours.weekEnd}</bdi>
                  </p>
                  <p>
                    <span>{t('friday')}</span>
                    <bdi>{c.hours.fridayStart}
                      –

                    {c.hours.fridayEnd}</bdi>
                  </p>
                </> : <p>{t('unavailable')}</p>}
              </Panel>
            </aside>
          </div>}
          {tab === 'services' && <div className="pd-grid">
            {!c.services.length && <p>{t('empty')}</p>}
            {c.services.map(s => <Panel
              key={s.id}
              className={`pd-service-card ${params.get('service') === s.id ? 'pd-selected' : ''}`}
            >
              <RecordImage className="pd-service-image" src={s.imageUrl} alt={name(s.name)} />
              <h2>{name(s.name)}</h2>
              <p>{name(s.description)}</p>
              <div className="pd-service-footer">
                <div>
                  <strong>{Number.isFinite(s.price) ? money(s.price) : t('unavailable')}</strong>
                  <small><FontAwesomeIcon icon={faClock} aria-hidden="true" /> {t('minutes', {
                    count: s.duration
                  })}</small>
                </div>
                <Button
                  size="sm"
                  onClick={() => setBooking({
                    centerId,
                    serviceId: s.id
                  })}
                >
                  {t('book')}
                </Button>
              </div>
            </Panel>)}
          </div>}
          {tab === 'therapists' && <div className="pd-grid">
            {!c.therapists.length && <p>{t('empty')}</p>}
            {c.therapists.map(p => <Panel key={p.id} className="pd-therapist-card">
              <RecordImage className="pd-portrait" src={p.imageUrl} alt={name(p.name)} />
              <h2>{name(p.name)}</h2>
              <p>{name(p.specialty)}</p>
              <Button
                onClick={() => navigate(`/patient/centers/${encodeURIComponent(centerId)}/therapists/${encodeURIComponent(p.id)}`)}
              >
                {t('viewProfile')}
              </Button>
            </Panel>)}
          </div>}
          {tab === 'reviews' && <ReviewsCarousel key={c.id} center={c} />}
        </div>
      </> : <p>{t('notFound')}</p>}
      {booking && <BookingModal key={centerId} state={state} initial={booking} onClose={() => setBooking(null)} />}
    </DiscoveryState>
  </div>;
}
