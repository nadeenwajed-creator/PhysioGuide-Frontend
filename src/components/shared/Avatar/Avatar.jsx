
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons';

import { useLanguage } from '../../../context/LanguageContext.jsx';
import { PERSON_PLACEHOLDER_IMAGE } from '../../../utils/personImage.js';

import './Avatar.css';

function Avatar({
  src,
  name = '',
  alt,
  size = 'md',
  status = 'none',
  statusLabel,
  className = '',
}) {
  const { t } = useLanguage();

  const [imageState, setImageState] = useState({
    src,
    failed: [],
  });

  // Reset the image error when the source changes.
  if (imageState.src !== src) {
    setImageState({
      src,
      failed: [],
    });
  }

  const displayName = typeof name === 'string' ? name.trim() : '';
  const accessibleLabel = alt === undefined ? displayName : alt;
  const avatarSize = ['sm', 'md', 'lg'].includes(size) ? size : 'md';
  const hasStatus = status === 'online' || status === 'offline';

  const resolvedStatusLabel = hasStatus
    ? statusLabel ?? t(`avatar.${status}`)
    : undefined;

  // People without a profile photo get a generated face from
  // thispersondoesnotexist.com; the initials stay as the last resort when even
  // that image cannot be loaded.
  const failed = imageState.failed;
  const resolvedSrc = src && !failed.includes(src)
    ? src
    : !failed.includes(PERSON_PLACEHOLDER_IMAGE)
      ? PERSON_PLACEHOLDER_IMAGE
      : null;

  const showImage = Boolean(resolvedSrc);

  const nameParts = displayName ? displayName.split(/\s+/) : [];
  const initials = nameParts.length === 0
    ? []
    : [
      Array.from(nameParts[0])[0].toUpperCase(),
      ...(nameParts.length > 1
        ? [Array.from(nameParts[nameParts.length - 1])[0].toUpperCase()]
        : []),
    ];

  const avatarClasses = [
    'pg-avatar',
    `pg-avatar--${avatarSize}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={avatarClasses}>
      <span className="pg-avatar__visual">
        {showImage ? (
          <img
            key={resolvedSrc}
            className="pg-avatar__image"
            src={resolvedSrc}
            alt={accessibleLabel}
            onError={() => {
              setImageState((previous) => ({
                src,
                failed: [...previous.failed, resolvedSrc],
              }));
            }}
          />
        ) : (
          <span
            className="pg-avatar__fallback"
            role={accessibleLabel ? 'img' : undefined}
            aria-label={accessibleLabel || undefined}
            aria-hidden={accessibleLabel ? undefined : true}
          >
            {initials.length > 0 ? (
              <span
                className="pg-avatar__initials"
                dir="auto"
                aria-hidden="true"
              >
                {initials.map((letter, index) => (
                  <span key={index}>{letter}</span>
                ))}
              </span>
            ) : (
              <FontAwesomeIcon
                icon={faUser}
                className="pg-avatar__icon"
                aria-hidden="true"
              />
            )}
          </span>
        )}
      </span>

      {hasStatus && (
        <span
          className={`pg-avatar__status pg-avatar__status--${status}`}
          role={resolvedStatusLabel ? 'img' : undefined}
          aria-label={resolvedStatusLabel || undefined}
          aria-hidden={resolvedStatusLabel ? undefined : true}
        />
      )}
    </span>
  );
}

export default Avatar;
