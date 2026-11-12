import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar as solidStar } from '@fortawesome/free-solid-svg-icons';
import { faStar as outlineStar } from '@fortawesome/free-regular-svg-icons';
import Modal from '../shared/Modal/Modal.jsx';
import Button from '../shared/Button/Button.jsx';
import { Feedback } from '../center/CenterUI.jsx';
import { usePatientLabels } from './usePatientLabels.js';
import { createPatientReview } from '../../services/patientDiscoveryService.js';
import './PatientReview.css';

// One review per completed appointment: the server attaches the review to the
// patient's newest unreviewed visit at this center, so the form only asks for a
// rating and an optional comment.
export default function ReviewModal({ center, state, onClose, onSaved }) {
  const { t, name, dir } = usePatientLabels();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await createPatientReview(state.actor, {
        centerId: center.id,
        rating,
        comment
      });
      onSaved();
    } catch (failure) {
      setError(failure?.code === 'review_not_allowed' ? t('reviewNotAllowed') : t('error'));
    } finally {
      setBusy(false);
    }
  }
  return <Modal
    isOpen
    title={t('reviewTitle')}
    onClose={() => !busy && onClose()}
    closeOnEscape={!busy}
    closeOnOverlay={!busy}
    showCloseButton={!busy}
    dir={dir}
    footer={<>
      <Button variant="outline" disabled={busy} onClick={onClose}>{t('cancel')}</Button>
      <Button type="submit" form="patient-review-form" loading={busy}>{t('reviewSubmit')}</Button>
    </>}
  >
    <form id="patient-review-form" className="pd-review-form" onSubmit={submit} noValidate>
      <p className="pd-review-center">{name(center.name)}</p>
      <fieldset className="pd-review-stars">
        <legend>{t('reviewRating')}</legend>
        <div role="radiogroup" aria-label={t('reviewRating')}>
          {[1, 2, 3, 4, 5].map(value => <button
            key={value}
            type="button"
            role="radio"
            aria-checked={rating === value}
            aria-label={t('reviewStar', { count: value })}
            className={`pd-review-star ${value <= rating ? 'is-on' : ''}`}
            disabled={busy}
            onClick={() => setRating(value)}
          >
            <FontAwesomeIcon icon={value <= rating ? solidStar : outlineStar} />
          </button>)}
        </div>
      </fieldset>
      <label className="pd-review-comment" htmlFor="patient-review-comment">
        {t('reviewComment')}
        <textarea
          id="patient-review-comment"
          rows={4}
          maxLength={1000}
          value={comment}
          disabled={busy}
          placeholder={t('reviewPlaceholder')}
          onChange={event => setComment(event.target.value)}
        />
      </label>
      <p className="pd-review-help">{t('reviewHelp')}</p>
      <Feedback error>{error}</Feedback>
    </form>
  </Modal>;
}
