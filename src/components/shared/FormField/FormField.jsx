import { useId, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEye,
  faEyeSlash,
} from '@fortawesome/free-solid-svg-icons';

import './FormField.css';

function FormField({
  label,
  id,
  name,
  as = 'input',
  type = 'text',
  rows = 4,
  layout = 'vertical',
  placeholder,
  value,
  defaultValue,
  onChange,
  required = false,
  disabled = false,
  readOnly = false,
  error,
  helperText,
  dir,
  className = '',
  autoComplete,
  showPasswordToggle = false,
  showPasswordLabel = 'Show password',
  hidePasswordLabel = 'Hide password',
}) {
  const generatedId = useId();
  const [passwordVisible, setPasswordVisible] = useState(false);

  const fieldId = id ?? generatedId;
  const helperId = `${fieldId}-helper`;
  const errorId = `${fieldId}-error`;

  const isTextarea = as === 'textarea';
  const isControlled = value !== undefined;
  const hasError = Boolean(error);

  const hasPasswordToggle =
    !isTextarea &&
    type === 'password' &&
    showPasswordToggle;

  const inputType =
    hasPasswordToggle && passwordVisible ? 'text' : type;

  const describedBy = [
    helperText && helperId,
    hasError && errorId,
  ]
    .filter(Boolean)
    .join(' ') || undefined;

  const fieldClasses = [
    'pg-form-field',
    layout === 'horizontal' && 'pg-form-field--horizontal',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const controlClasses = [
    'pg-form-field__control',
    isTextarea && 'pg-form-field__control--textarea',
    hasPasswordToggle && 'pg-form-field__control--password',
  ]
    .filter(Boolean)
    .join(' ');

  function handleChange(event) {
    onChange?.(event.target.value);
  }

  // Share native field attributes without duplicating them.
  const controlProps = {
    id: fieldId,
    name,
    className: controlClasses,
    placeholder,
    value: isControlled ? value : undefined,
    defaultValue: isControlled ? undefined : defaultValue,
    onChange: handleChange,
    required,
    disabled,
    readOnly,
    autoComplete,
    dir,
    'aria-invalid': hasError || undefined,
    'aria-describedby': describedBy,
  };

  return (
    <div className={fieldClasses}>
      <div className="pg-form-field__layout">
        <label
          className="pg-form-field__label"
          htmlFor={fieldId}
        >
          {label}

          {required && (
            <span
              className="pg-form-field__required"
              aria-hidden="true"
            >
              *
            </span>
          )}
        </label>

        <div className="pg-form-field__content">
          <div
            className="pg-form-field__input-wrap"
            dir={dir}
          >
            {isTextarea ? (
              <textarea
                {...controlProps}
                rows={rows}
              />
            ) : (
              <input
                {...controlProps}
                type={inputType}
              />
            )}

            {hasPasswordToggle && (
              <button
                type="button"
                className="pg-form-field__password-toggle"
                aria-label={
                  passwordVisible
                    ? hidePasswordLabel
                    : showPasswordLabel
                }
                aria-controls={fieldId}
                disabled={disabled}
                onClick={() => {
                  setPasswordVisible((visible) => !visible);
                }}
              >
                <FontAwesomeIcon
                  icon={passwordVisible ? faEyeSlash : faEye}
                  className="pg-form-field__password-icon"
                  aria-hidden="true"
                />
              </button>
            )}
          </div>

          {helperText && (
            <p
              id={helperId}
              className="pg-form-field__helper"
            >
              {helperText}
            </p>
          )}

          {hasError && (
            <p
              id={errorId}
              className="pg-form-field__error"
            >
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default FormField;