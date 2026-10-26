import { usePatientLabels } from '../../components/patient/usePatientLabels.js';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  faCalendarDays,
  faBriefcaseMedical,
  faBuilding,
  faChevronRight
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { serviceIcon } from '../../components/patient/serviceIcon.js';
import Button from '../../components/shared/Button/Button.jsx';
import { Panel, PageHeader } from '../../components/center/CenterUI.jsx';
import useDiscovery from '../../components/patient/useDiscovery.js';
import { DiscoveryState, CenterCard } from '../../components/patient/DiscoveryUI.jsx';
import BookingModal from '../../components/patient/BookingModal.jsx';
import hero from '../../assets/images/patient/dashboard-rehabilitation-hero.jpeg';
import '../../components/patient/PatientDiscovery.css';

export default function Dashboard() {
  const state = useDiscovery();
  const { t, name, dir } = usePatientLabels();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  // Sort a copy so the recommendations do not reorder discovery data
  const centers = [...(state.data?.centers || [])].sort((a, b) => (b.rating || 0) - (a.rating || 0));
  // Keep the preview short: three centers and four service links
  return <div className="pd-page">
    <PageHeader
      title={t('welcome', {
        name: name(state.actor.name)
      })}
      description={t('intro')}
    />
    <section className="pd-hero">
      <img src={hero} alt={t('heroAlt')} />
      <div>
        <h2>{t('hero')}</h2>
        <p>{t('heroText')}</p>
        <Button icon={faCalendarDays} onClick={() => navigate('/patient/appointments')}>{`${t('appointments')} ${dir === 'rtl' ? '←' : '→'}`}</Button>
      </div>
    </section>
    <DiscoveryState state={state}>
      <div className="pd-dashboard-grid">
        <Panel
          className="pd-recommended-centers"
          title={<><FontAwesomeIcon icon={faBuilding} /> {t('recommendedCenters')}</>}
          action={<Button variant="ghost" onClick={() => navigate('/patient/centers')}>
            {t('viewAll')}
          </Button>}
        >
          <div className="pd-grid">
            {centers.slice(0, 3).map(c => <CenterCard key={c.id} center={c} state={state} onBook={setBooking} />)}
          </div>
          {!centers.length && <p>{t('empty')}</p>}
        </Panel>
        <Panel
          className="pd-recommended-services"
          title={<><FontAwesomeIcon icon={faBriefcaseMedical} /> {t('recommendedServices')}</>}
        >
          <div className="pd-recommendations">
            {centers.flatMap(c => c.services.map(s => ({
              ...s,
              centerId: c.id
            }))).slice(0, 4).map(s => <Button
              variant="outline"
              key={s.centerId + s.id}
              onClick={() => navigate(`/patient/centers/${encodeURIComponent(s.centerId)}?tab=services&service=${encodeURIComponent(s.id)}`)}
            >
              <span className="pd-service-link">
                <span className="pd-service-icon">
                  <FontAwesomeIcon icon={serviceIcon(s)} />
                </span>
                <span>{name(s.name)}</span>
                <FontAwesomeIcon className="pd-chevron" icon={faChevronRight} />
              </span>
            </Button>)}
          </div>
        </Panel>
      </div>
      {booking && <BookingModal state={state} initial={booking} onClose={() => setBooking(null)} />}
    </DiscoveryState>
  </div>;
}
