import { useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight, faCalendarDays } from '@fortawesome/free-solid-svg-icons';
import Button from '../shared/Button/Button.jsx';
import Modal from '../shared/Modal/Modal.jsx';
import Avatar from '../shared/Avatar/Avatar.jsx';
import RatingStars from '../shared/RatingStars/RatingStars.jsx';
import { Panel } from '../center/CenterUI.jsx';
import { usePatientLabels } from './usePatientLabels.js';
import useVisibleItems from './useVisibleItems.js';

export default function ReviewsCarousel({ center }) {
  const { t, name, dir, language } = usePatientLabels();
  const ref = useRef(null),
    touch = useRef(null),
    swiped = useRef(false);
  // Fit up to three reviews based on the available width
  const count = useVisibleItems(ref, 260, 3);
  const [offset, setOffset] = useState(0),
    [expandedId, setExpandedId] = useState(null);
  const reviews = center.reviews || [];
  // Keep the last group filled when resizing or receiving fewer reviews
  const start = Math.min(offset, Math.max(0, reviews.length - count));
  const expanded = reviews.find(r => r.id === expandedId);
  const move = delta => setOffset(Math.max(0, Math.min(reviews.length - count, start + delta)));
  const date = value => {
    // Treat a date without a time as local noon to keep the same calendar day
    const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value + 'T12:00:00') : new Date(value);
    return Number.isFinite(parsed.getTime()) ? new Intl.DateTimeFormat(language, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(parsed) : t('unavailable');
  };
  return <Panel className="pd-reviews-carousel">
    <div className="pd-reviews-heading">
      <div>
        <h2>{t('patientReviews')}</h2>
        <div className="pd-rating">
          {Number.isFinite(center.rating) && <RatingStars rating={center.rating} showValue />}
          <span>
            {t('reviewCount', {
              count: reviews.length
            })}
          </span>
        </div>
      </div>
      {reviews.length > count && <div className="pd-carousel-controls">
        <Button
          variant="outline"
          iconOnly
          icon={dir === 'rtl' ? faChevronRight : faChevronLeft}
          aria-label={t('previousReviews')}
          disabled={start === 0}
          onClick={() => move(-1)}
        />
        <Button
          variant="outline"
          iconOnly
          icon={dir === 'rtl' ? faChevronLeft : faChevronRight}
          aria-label={t('nextReviews')}
          disabled={start + count >= reviews.length}
          onClick={() => move(1)}
        />
      </div>}
    </div>
    <div
      ref={ref}
      className="pd-review-window"
      tabIndex={reviews.length > count ? 0 : undefined}
      aria-label={t('patientReviews')}
      onKeyDown={event => {
        // Let buttons inside a review handle their own keyboard events
        if (event.target !== event.currentTarget) return;
        if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
          event.preventDefault();
          if (event.key === 'Home') setOffset(0);
          else if (event.key === 'End') setOffset(Math.max(0, reviews.length - count));
          else move((event.key === 'ArrowRight' ? 1 : -1) * (dir === 'rtl' ? -1 : 1));
        }
      }}
      onClickCapture={event => {
        // Do not open a review from the click fired after a swipe
        if (swiped.current && event.detail) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
      onPointerDown={event => {
        swiped.current = false;
        if (event.pointerType === 'touch') touch.current = event.clientX;
      }}
      onPointerUp={event => {
        if (touch.current !== null && Math.abs(event.clientX - touch.current) > 40) {
          swiped.current = true;
          move((event.clientX < touch.current ? 1 : -1) * (dir === 'rtl' ? -1 : 1));
        }
        touch.current = null;
      }}
      onPointerCancel={() => {
        touch.current = null;
      }}
    >
      {!reviews.length ? <p role="status">{t('noRating')}</p> : <div
        className="pd-review-track"
        style={{
          '--review-count': Math.min(count, reviews.length)
        }}
      >
        {reviews.slice(start, start + count).map(review => <article className="pd-review-card" key={review.id}>
          <header>
            <Avatar src={review.authorImageUrl} name={name(review.author)} />
            <div>
              <h3>{name(review.author) || t('reviews')}</h3>
              <RatingStars rating={review.rating} />
            </div>
          </header>
          <p className="pd-review-preview">
            {name(review.text).length > 140 ? `${name(review.text).slice(0, 140)}…` : name(review.text)}
          </p>
          {(name(review.text).length > 140 || name(review.reply)) && <Button variant="ghost" size="sm" onClick={() => setExpandedId(review.id)}>
            {t('fullReview')}
          </Button>}
          <time dateTime={review.date}><FontAwesomeIcon icon={faCalendarDays} aria-hidden="true" /> {date(review.date)}</time>
        </article>)}
      </div>}
    </div>
    {expanded && <Modal isOpen title={t('reviewDetails')} onClose={() => setExpandedId(null)}>
      <div className="pd-review-full">
        <h3>{name(expanded.author) || t('reviews')}</h3>
        <RatingStars rating={expanded.rating} />
        <p>{name(expanded.text)}</p>
        <time dateTime={expanded.date}>
          {date(expanded.date)}
        </time>
        {name(expanded.reply) && <section className="pd-center-response">
          <h3>{t('centerResponse')}</h3>
          <blockquote>
            {name(expanded.reply)}
          </blockquote>
        </section>}
      </div>
    </Modal>}
  </Panel>;
}
