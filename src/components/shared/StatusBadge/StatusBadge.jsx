
import './StatusBadge.css';

function StatusBadge({
  status = 'pending',
  children,
  className = '',
  dir,
}) {
  const allowedStatuses = [
    'confirmed',
    'pending',
    'completed',
    'cancelled',
  ];

  const badgeStatus = allowedStatuses.includes(status)
    ? status
    : 'pending';

  const classes = [
    'pg-status-badge',
    `pg-status-badge--${badgeStatus}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} dir={dir}>
      {children}
    </span>
  );
}

export default StatusBadge;
