import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { faHeart } from '@fortawesome/free-solid-svg-icons';
import { faHeart as faHeartOutline } from '@fortawesome/free-regular-svg-icons';
import Button from '../shared/Button/Button.jsx';
import RatingStars from '../shared/RatingStars/RatingStars.jsx';
import { RecordImage, Feedback } from '../center/CenterUI.jsx';
import { usePatientLabels } from './usePatientLabels.js';
import { setPatientFavorite } from '../../services/patientDiscoveryService.js';

// Show loading or retry before displaying the discovery content
export function DiscoveryState({ state, children }) {
  const { t } = usePatientLabels();
  if (state.error) return <>
    <Feedback error>
      {t('error')}
    </Feedback>
    <Button onClick={state.retry}>{t('retry')}</Button>
  </>;
  if (!state.data) return <p role="status">{t('loading')}</p>;
  return children;
}

export function Favorite({ center, state }) {
  const { t } = usePatientLabels();
  // Read the saved state from discovery data so the cards stay in sync
  const saved = (state.data.favoriteIds || []).includes(center.id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  return <>
    <Button
      className={`pd-favorite ${saved ? 'is-saved' : ''}`}
      variant="outline"
      iconOnly
      icon={saved ? faHeart : faHeartOutline}
      aria-label={t(saved ? 'unsave' : 'save')}
      aria-pressed={saved}
      loading={busy}
      onClick={async () => {
        setBusy(true);
        setError(false);
        try {
          // Send the opposite of the current saved state
          await setPatientFavorite(state.actor, center.id, !saved);
        } catch {
          setError(true);
        } finally {
          setBusy(false);
        }
      }}
    />
    <Feedback error>
      {error && t('error')}
    </Feedback>
  </>;
}

export function CenterRating({ center }) {
  const { t } = usePatientLabels();
  // A missing rating should show a label instead of empty stars
  return !Number.isFinite(center.rating) ? <small>
    {t('noRating')}
  </small> : <div className="pd-rating">
    <RatingStars rating={center.rating} showValue />
    <small>
      {t('reviewCount', {
        count: center.reviews?.length || 0
      })}
    </small>
  </div>;
}

export function CenterCard({ center, state, onBook }) {
  const { t, name, money } = usePatientLabels();
  const navigate = useNavigate();
  // Use the lowest valid service price for the starting price
  const prices = center.services.map(s => s.price).filter(Number.isFinite);
  return <article className="pd-card">
    <div className="pd-card-photo">
      <RecordImage src={center.imageUrl} alt={name(center.name)} />
      <Favorite center={center} state={state} />
    </div>
    <div className="pd-card-body">
      <h3>{name(center.name)}</h3>
      <CenterRating center={center} />
      <p>{name(center.city) || name(center.address)}</p>
      <div className="pd-chips">
        {center.services.slice(0, 2).map(s => <span key={s.id}>{name(s.name)}</span>)}
      </div>
      {prices.length > 0 && <small className="pd-starting-price">{`${t('from')} ${money(Math.min(...prices))}`}</small>}
      <div className="pd-card-actions">
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate(`/patient/centers/${encodeURIComponent(center.id)}`)}
        >
          {t('viewCenter')}
        </Button>
        <Button
          size="sm"
          onClick={() => onBook({
            centerId: center.id
          })}
          disabled={!center.services.length}
        >
          {t('book')}
        </Button>
      </div>
    </div>
  </article>;
}
