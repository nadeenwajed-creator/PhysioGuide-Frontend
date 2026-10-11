import { useId, useRef, useState } from 'react';
import Dropdown from 'react-bootstrap/Dropdown';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisVertical } from '@fortawesome/free-solid-svg-icons';

import './ActionsMenu.css';

const popperConfig = {
  strategy: 'fixed',
  modifiers: [
    {
      name: 'offset',
      options: { offset: [0, 8] },
    },
    {
      name: 'preventOverflow',
      options: {
        padding: 12,
        altAxis: true,
        tether: false,
      },
    },
    {
      name: 'flip',
      options: { padding: 12 },
    },
  ],
};

function ActionsMenu({
  items = [],
  ariaLabel = 'Actions',
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef(null);
  const id = useId();

  const menuClasses = [
    'pg-actions-menu',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  function handleKeyDown(event) {
    if (open && event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      toggleRef.current?.focus({ preventScroll: true });
    }
  }

  function handleAction(item) {
    if (item.disabled) {
      return;
    }

    setOpen(false);
    toggleRef.current?.focus({ preventScroll: true });
    item.onClick?.();
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <Dropdown
      className={menuClasses}
      show={open}
      onToggle={setOpen}
      onKeyDown={handleKeyDown}
      align="end"
      focusFirstItemOnShow
      popperConfig={popperConfig}
    >
      <Dropdown.Toggle
        as="button"
        ref={toggleRef}
        id={`${id}-toggle`}
        type="button"
        className="pg-actions-menu__toggle"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-controls={`${id}-menu`}
      >
        <FontAwesomeIcon
          icon={faEllipsisVertical}
          aria-hidden="true"
        />
      </Dropdown.Toggle>

      <Dropdown.Menu
        id={`${id}-menu`}
        className="pg-actions-menu__menu"
        role="menu"
        aria-labelledby={`${id}-toggle`}
        renderOnMount
      >
        {items.map((item, index) => (
          <Dropdown.Item
            key={index}
            as="button"
            type="button"
            role="menuitem"
            eventKey={String(index)}
            className={[
              'pg-actions-menu__item',
              item.variant === 'danger' &&
                'pg-actions-menu__item--danger',
            ]
              .filter(Boolean)
              .join(' ')}
            disabled={item.disabled}
            onClick={() => handleAction(item)}
          >
            {item.icon && (
              <FontAwesomeIcon
                icon={item.icon}
                className="pg-actions-menu__icon"
                aria-hidden="true"
              />
            )}

            <span className="pg-actions-menu__label">
              {item.label}
            </span>
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
}

export default ActionsMenu;