import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar as solidStar } from '@fortawesome/free-solid-svg-icons';
import { faStar as outlineStar } from '@fortawesome/free-regular-svg-icons';

import './RatingStars.css';

function RatingStars({
  rating = 0,
  showValue = false,
  size = 'sm',
  ariaLabel,
  dir,
  className = '',
}) {
  const safeRating = Number.isFinite(rating)
    ? Math.min(5, Math.max(0, rating))
    : 0;

  const ratingSize = size === 'md' ? 'md' : 'sm';

  const ratingClasses = [
    'pg-rating-stars',
    `pg-rating-stars--${ratingSize}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const accessibleLabel = ariaLabel ?? `${safeRating} / 5`;

  const ratingDir =
    dir === 'rtl' || dir === 'ltr'
      ? dir
      : undefined;

  return (
    <span
      className={ratingClasses}
      role="img"
      aria-label={accessibleLabel}
      dir={ratingDir}
    >
      <span
        className="pg-rating-stars__list"
        aria-hidden="true"
        dir="ltr"
      >
        {Array.from({ length: 5 }, (_, index) => {
          const fillPercentage =
            Math.min(1, Math.max(0, safeRating - index)) * 100;

          return (
            <span
              className="pg-rating-stars__star"
              key={index}
            >
              <FontAwesomeIcon
                icon={outlineStar}
                className="pg-rating-stars__icon"
              />

              <span
                className="pg-rating-stars__fill"
                style={{
                  inlineSize: `${fillPercentage}%`,
                }}
              >
                <FontAwesomeIcon
                  icon={solidStar}
                  className="pg-rating-stars__icon"
                />
              </span>
            </span>
          );
        })}
      </span>

      {showValue && (
        <bdi
          className="pg-rating-stars__value"
          aria-hidden="true"
        >
          {safeRating}
        </bdi>
      )}
    </span>
  );
}

export default RatingStars;