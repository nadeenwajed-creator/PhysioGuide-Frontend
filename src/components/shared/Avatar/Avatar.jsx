
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons';

import { useLanguage } from '../../../context/LanguageContext.jsx';

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
    failed: false,
  });

  // Reset the image error when the source changes.
  if (imageState.src !== src) {
    setImageState({
      src,
      failed: false,
    });
  }

  const displayName = typeof name === 'string' ? name.trim() : '';
  const accessibleLabel = alt === undefined ? displayName : alt;
  const avatarSize = ['sm', 'md', 'lg'].includes(size) ? size : 'md';
  const hasStatus = status === 'online' || status === 'offline';

  const resolvedStatusLabel = hasStatus
    ? statusLabel ?? t(`avatar.${status}`)
    : undefined;

  const showImage = Boolean(src) &&
    !(imageState.src === src && imageState.failed);

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
            key={src}
            className="pg-avatar__image"
            src={src}
            alt={accessibleLabel}
            onError={() => {
              setImageState({
                src,
                failed: true,
              });
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
