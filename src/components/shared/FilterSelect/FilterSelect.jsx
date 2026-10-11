import './FilterSelect.css';

function FilterSelect({
  options = [],
  value,
  defaultValue,
  onChange,
  name,
  id,
  ariaLabel,
  disabled = false,
  required = false,
  className = '',
  dir,
}) {
  const isControlled = value !== undefined;

  const selectClasses = [
    'pg-filter-select',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  function handleChange(event) {
    onChange?.(event.target.value);
  }

  return (
    <select
      id={id}
      name={name}
      className={selectClasses}
      dir={dir}
      value={isControlled ? value : undefined}
      defaultValue={isControlled ? undefined : defaultValue}
      onChange={handleChange}
      aria-label={ariaLabel}
      disabled={disabled}
      required={required}
    >
      {options.map((option) => (
        <option
          key={option.value}
          value={option.value}
        >
          {option.label}
        </option>
      ))}
    </select>
  );
}

export default FilterSelect;