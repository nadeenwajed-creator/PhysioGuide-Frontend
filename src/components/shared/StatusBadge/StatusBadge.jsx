// One translated status tag per record, with a tone for each status.


import { useLanguage } from '../../../context/LanguageContext.jsx';

import './StatusBadge.css';

// Status of a record as one coloured tag.
function StatusBadge({
  status = 'pending',
  children,
  className = '',
  dir,
}) {
  const { t, dir: languageDir } = useLanguage();

  const allowedStatuses = [
    'confirmed',
    'pending',
    'completed',
    'cancelled',
    // Admin moderation vocabulary (centers, patients, therapists, reviews).
    'approved',
    'rejected',
    'active',
    'inactive',
    'suspended',
    'published',
    'hidden',
    'reported',
  ];

  const badgeStatus = allowedStatuses.includes(status)
    ? status
    : 'pending';

  const resolvedDir = dir ?? languageDir;

  const resolvedLabel =
    children ?? t(`statusBadge.${badgeStatus}`);

  const classes = [
    'pg-status-badge',
    `pg-status-badge--${badgeStatus}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} dir={resolvedDir}>
      {resolvedLabel}
    </span>
  );
}

export default StatusBadge;
