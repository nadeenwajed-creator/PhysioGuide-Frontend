
import { useLanguage } from '../../../context/LanguageContext.jsx';

import './StatusBadge.css';

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
