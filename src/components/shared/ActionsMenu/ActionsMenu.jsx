// Row action menu; `portal` renders the panel into document.body, `compact` gives the small ghost trigger.

import { useEffect, useId, useRef, useState } from 'react';
import Dropdown from 'react-bootstrap/Dropdown';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisVertical } from '@fortawesome/free-solid-svg-icons';

import { useLanguage } from '../../../context/LanguageContext.jsx';

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

// Space between the trigger and the panel in the `portal` placement.
const menuGap = 6;
// Height reserved below the trigger before the panel flips above it.
const menuEstimatedHeight = 180;
// Keeps the panel off the viewport edges.
const viewportPadding = 8;

// Classes of one menu item, including its danger state.
function itemClasses(item) {
  return [
    'pg-actions-menu__item',
    item.variant === 'danger' && 'pg-actions-menu__item--danger',
  ]
    .filter(Boolean)
    .join(' ');
}

// Icon and label of one menu item.
function ItemContent({ item }) {
  return (
    <>
      {item.icon && (
        <FontAwesomeIcon
          icon={item.icon}
          className="pg-actions-menu__icon"
          aria-hidden="true"
        />
      )}

      <span className="pg-actions-menu__label">{item.label}</span>
    </>
  );
}

/**
 * "⋯" actions menu.
 *
 * Default placement uses react-bootstrap's popper, which keeps the panel next
 * to its trigger and flips it when space runs out.
 *
 * The `portal` and `compact` props are opt-in extras for dense table rows
 * (admin list pages): `portal` renders the panel into the body and positions it
 * from the trigger's viewport rect, because a horizontally scrolling table
 * (overflow-x: auto, or a transformed ancestor) clips a panel positioned inside
 * the row, and `compact` shrinks the trigger to the tables' ghost icon button so
 * a row keeps its height.
 */
function ActionsMenu({
  items = [],
  ariaLabel,
  className = '',
  compact = false,
  portal = false,
}) {
  const { t, dir } = useLanguage();

  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState(null);
  const toggleRef = useRef(null);
  const menuRef = useRef(null);
  const id = useId();

  const resolvedAriaLabel = ariaLabel ?? t('actionsMenu.label');

  const menuClasses = [
    'pg-actions-menu',
    compact && 'pg-actions-menu--compact',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  // Closes the panel and optionally returns focus to the trigger.
  function closePortal({ restoreFocus = false } = {}) {
    setPlacement(null);

    if (restoreFocus) {
      toggleRef.current?.focus({ preventScroll: true });
    }
  }

  // Closes the panel on Escape.
  function handleKeyDown(event) {
    if (open && event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      toggleRef.current?.focus({ preventScroll: true });
    }
  }

  // Runs the chosen item, unless it is disabled.
  function handleAction(item) {
    if (item.disabled) {
      return;
    }

    if (portal) {
      closePortal({ restoreFocus: true });
    } else {
      setOpen(false);
      toggleRef.current?.focus({ preventScroll: true });
    }

    item.onClick?.();
  }

  // Opens the panel and places it next to the trigger.
  function togglePlacement() {
    if (placement) {
      closePortal({ restoreFocus: true });
      return;
    }

    const rect = toggleRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    const openUp = rect.bottom + menuEstimatedHeight > window.innerHeight;
    const rtl = dir === 'rtl';

    // Anchored to the trigger's inline end and flipped above when the row sits
    // near the bottom of the viewport.
    setPlacement({
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + menuGap }
        : { top: rect.bottom + menuGap }),
      ...(rtl
        ? { left: Math.max(viewportPadding, rect.left) }
        : { right: Math.max(viewportPadding, window.innerWidth - rect.right) }),
    });
  }

  // The panel is positioned in viewport units, so any scroll or resize makes
  // that position stale; close instead of tracking the row.
  useEffect(() => {
    if (!placement) {
      return undefined;
    }

    // Closes the panel when the pointer goes down outside it.
    const onPointerDown = (event) => {
      if (menuRef.current?.contains(event.target)) return;
      if (toggleRef.current?.contains(event.target)) return;
      closePortal();
    };
    // Closes the panel when the page scrolls or resizes.
    const onViewportChange = () => closePortal();

    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('scroll', onViewportChange, true);
    window.addEventListener('resize', onViewportChange);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('scroll', onViewportChange, true);
      window.removeEventListener('resize', onViewportChange);
    };
  }, [placement]);

  // Matches the popper placement's focusFirstItemOnShow.
  useEffect(() => {
    if (placement) {
      menuRef.current
        ?.querySelector('[role="menuitem"]:not(:disabled)')
        ?.focus({ preventScroll: true });
    }
  }, [placement]);

  // Moves through the items with the keyboard.
  function handleMenuKeyDown(event) {
    const nodes = Array.from(
      menuRef.current?.querySelectorAll('[role="menuitem"]:not(:disabled)') ??
        []
    );

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closePortal({ restoreFocus: true });
      return;
    }

    if (event.key === 'Tab') {
      closePortal();
      return;
    }

    if (!nodes.length) {
      return;
    }

    const index = nodes.indexOf(document.activeElement);
    let next;

    if (event.key === 'ArrowDown') {
      next = index < 0 ? 0 : (index + 1) % nodes.length;
    } else if (event.key === 'ArrowUp') {
      next = index <= 0 ? nodes.length - 1 : index - 1;
    } else if (event.key === 'Home') {
      next = 0;
    } else if (event.key === 'End') {
      next = nodes.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    nodes[next]?.focus();
  }

  if (items.length === 0) {
    return null;
  }

  if (portal) {
    return (
      <span className={menuClasses}>
        <button
          ref={toggleRef}
          id={`${id}-toggle`}
          type="button"
          className="pg-actions-menu__toggle"
          aria-label={resolvedAriaLabel}
          aria-haspopup="menu"
          aria-expanded={placement ? 'true' : 'false'}
          aria-controls={placement ? `${id}-menu` : undefined}
          onClick={togglePlacement}
        >
          <FontAwesomeIcon icon={faEllipsisVertical} aria-hidden="true" />
        </button>

        {placement &&
          createPortal(
            <div
              ref={menuRef}
              id={`${id}-menu`}
              className="pg-actions-menu__menu pg-actions-menu__menu--portal"
              role="menu"
              aria-labelledby={`${id}-toggle`}
              dir={dir}
              style={placement}
              onKeyDown={handleMenuKeyDown}
            >
              {items.map((item, index) => (
                <button
                  key={index}
                  type="button"
                  role="menuitem"
                  className={itemClasses(item)}
                  disabled={item.disabled}
                  onClick={() => handleAction(item)}
                >
                  <ItemContent item={item} />
                </button>
              ))}
            </div>,
            document.body
          )}
      </span>
    );
  }

  return (
    <Dropdown
      className={menuClasses}
      show={open}
      onToggle={setOpen}
      onKeyDown={handleKeyDown}
      align={dir === 'rtl' ? 'start' : 'end'}
      dir={dir}
      focusFirstItemOnShow
    >
      <Dropdown.Toggle
        as="button"
        ref={toggleRef}
        id={`${id}-toggle`}
        type="button"
        className="pg-actions-menu__toggle"
        aria-label={resolvedAriaLabel}
        aria-haspopup="menu"
        aria-controls={`${id}-menu`}
      >
        <FontAwesomeIcon icon={faEllipsisVertical} aria-hidden="true" />
      </Dropdown.Toggle>

      <Dropdown.Menu
        id={`${id}-menu`}
        className="pg-actions-menu__menu"
        role="menu"
        aria-labelledby={`${id}-toggle`}
        renderOnMount
        popperConfig={popperConfig}
      >
        {items.map((item, index) => (
          <Dropdown.Item
            key={index}
            as="button"
            type="button"
            role="menuitem"
            eventKey={String(index)}
            className={itemClasses(item)}
            disabled={item.disabled}
            onClick={() => handleAction(item)}
          >
            <ItemContent item={item} />
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
}

export default ActionsMenu;
