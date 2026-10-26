import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheck,
  faCircleInfo,
  faRotateRight,
  faLocationDot,
  faArrowRight,
  faArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../../context/AuthContext.jsx';
import { useLanguage } from '../../../context/LanguageContext.jsx';
import { localized } from '../../../utils/centerFormat.js';
import { getPatientDiscovery, subscribePatientDiscovery } from '../../../services/patientDiscoveryService.js';
import { matchingCenters } from '../../../services/patient/painAssessmentModel.js';
import { CenterRating, Favorite } from '../DiscoveryUI.jsx';
import { RecordImage, ConfirmDialog } from '../../center/CenterUI.jsx';
import Button from '../../shared/Button/Button.jsx';

function SuggestedCenters({ care, t }) {
  const { session: actor } = useAuth();
  const { language, dir } = useLanguage();
  const [state, setState] = useState({
    data: null,
    error: false
  });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true,
      request = 0;
    const timers = new Set();
    async function refresh() {
      // Only the latest request can update the list if refreshes overlap
      const id = ++request;
      // Show a retry option if loading takes longer than eight seconds
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        if (live && request === id) setState({
          data: null,
          error: true
        });
      }, 8000);
      timers.add(timer);
      try {
        const data = await getPatientDiscovery(actor);
        if (live && request === id) setState({
          data,
          error: false
        });
      } catch {
        if (live && request === id) setState({
          data: null,
          error: true
        });
      } finally {
        clearTimeout(timer);
        timers.delete(timer);
      }
    }
    refresh();
    const unsubscribe = subscribePatientDiscovery(refresh);
    return () => {
      // Ignore late responses and stop watching data after leaving this result
      live = false;
      timers.forEach(clearTimeout);
      unsubscribe();
    };
  }, [actor, attempt]);
  if (state.error) return <div className="pain-empty" role="status">
    <p>{t('centersUnavailable')}</p>
    <Button
      variant="outline"
      onClick={() => {
        setState({
          data: null,
          error: false
        });
        setAttempt(n => n + 1);
      }}
    >
      {t('retry')}
    </Button>
  </div>;
  if (!state.data) return <p className="pain-empty" role="status">{t('centersLoading')}</p>;
  // Allow demo matching only when discovery data is explicitly in mock mode
  const centers = matchingCenters(state.data.centers, care, {
    allowMock: state.data.mode === 'mock'
  });
  if (!centers.length) return <p className="pain-empty" role="status">{t('centersEmpty')}</p>;
  const name = value => localized(value, language);
  return <>
    {state.data.mode === 'mock' && <p className="pain-caption">{t('mockCenters')}</p>}
    <div className="pain-centers">
      {centers.map(center => <article className="pd-card" key={center.id}>
        <div className="pd-card-photo">
          <RecordImage src={center.imageUrl} alt={name(center.name)} />
          <Favorite
            center={center}
            state={{
              ...state,
              actor,
              data: {
                ...state.data,
                favoriteIds: state.data.favoriteIds || []
              }
            }}
          />
        </div>
        <div className="pd-card-body">
          <h3>{name(center.name)}</h3>
          <p><FontAwesomeIcon icon={faLocationDot} /> {name(center.city) || name(center.address)}</p>
          <CenterRating
            center={{
              ...center,
              rating: Number.isFinite(center.rating) && center.rating >= 0 && center.rating <= 5 ? center.rating : null,
              reviews: center.reviews || []
            }}
          />
          <div className="pd-chips">
            {center.matchingServices.slice(0, 3).map(service => <span key={service.id}>{name(service.name)}</span>)}
          </div>
          <Link className="pain-center-link" to={`/patient/centers/${encodeURIComponent(center.id)}`}>{t('viewCenter')} <FontAwesomeIcon icon={dir === 'rtl' ? faArrowLeft : faArrowRight} /></Link>
        </div>
      </article>)}
    </div>
  </>;
}

export default function AssessmentResult({ care, onRestart, t, headingRef }) {
  // Ask before restarting because it clears the current answers
  const [confirm, setConfirm] = useState(false);
  return <div className="pain-result">
    <section className="pain-result-hero" aria-labelledby="pain-result-title">
      <span className="pain-result-check" aria-hidden="true">
        <FontAwesomeIcon icon={faCheck} />
      </span>
      <p>{t('done')}</p>
      <h1 id="pain-result-title" tabIndex={-1} ref={headingRef}>{t('suggested')}</h1>
      <h2>
        {t(`care.${care}`)}
      </h2>
      <p>{t('careHelp')}</p>
    </section>
    <section className="pain-result-centers" aria-labelledby="pain-centers-title">
      <h2 id="pain-centers-title">{t('centers')} <Link
        className="pd-matching-link"
        to={`/patient/centers?specialty=${encodeURIComponent(`care:${care}`)}`}
      >
        {t('exploreCenters')}
      </Link></h2>
      <SuggestedCenters care={care} t={t} />
    </section>
    <div className="pain-disclaimer">
      <FontAwesomeIcon icon={faCircleInfo} aria-hidden="true" />
      <p>{t('disclaimer')}</p>
      <Button icon={faRotateRight} onClick={() => setConfirm(true)}>
        {t('restart')}
      </Button>
    </div>
    {confirm && <ConfirmDialog
      title={t('restartTitle')}
      description={t('restartHelp')}
      onClose={() => setConfirm(false)}
      onConfirm={onRestart}
    />}
  </div>;
}
