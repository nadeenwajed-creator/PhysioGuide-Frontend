import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

import './Button.css';

function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  iconOnly = false,
  className = '',
  ...buttonProps
}) {
  const allowedVariants = ['primary', 'outline', 'danger', 'ghost'];
  const allowedSizes = ['sm', 'md', 'lg'];

  const buttonVariant = allowedVariants.includes(variant)
    ? variant
    : 'primary';

  const buttonSize = allowedSizes.includes(size) ? size : 'md';

  // Loading disables the native button to prevent repeated actions.
  const isDisabled = disabled || loading;

  const buttonClasses = [
    'pg-button',
    `pg-button--${buttonVariant}`,
    `pg-button--${buttonSize}`,
    fullWidth && 'pg-button--full-width',
    iconOnly && 'pg-button--icon-only',
    loading && 'pg-button--loading',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      {...buttonProps}
      type={type}
      className={buttonClasses}
      disabled={isDisabled}
      aria-busy={loading || undefined}
    >
      {/* Keep content mounted to preserve size and the accessible name. */}
      <span className="pg-button__content">
        {icon && (
          <FontAwesomeIcon
            icon={icon}
            className="pg-button__icon"
            aria-hidden="true"
          />
        )}

        {children != null && (
          <span className="pg-button__label">{children}</span>
        )}
      </span>

      {loading && (
        <span className="pg-button__loader" aria-hidden="true">
          <FontAwesomeIcon
            icon={faSpinner}
            className="pg-button__spinner"
          />
        </span>
      )}
    </button>
  );
}

export default Button;