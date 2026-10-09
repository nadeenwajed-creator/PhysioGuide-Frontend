import { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import Offcanvas from 'react-bootstrap/Offcanvas';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faXmark } from '@fortawesome/free-solid-svg-icons';

import './Sidebar.css';

function Sidebar({
  id = 'pg-sidebar',
  items = [],
  account,
  isOpen = false,
  onClose,
  navigationLabel = 'Main navigation',
  closeLabel = 'Close navigation',
}) {
  const closeButtonRef = useRef(null);
  const onCloseRef = useRef(onClose);

  // Keep the resize listener stable when the parent renders.
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const desktopQuery = window.matchMedia('(min-width: 992px)');
    let focusInSidebar = false;

    function trackFocus(event) {
      focusInSidebar = document.getElementById(id)?.contains(event.target) ?? false;
    }

    function handleResize() {
      if (desktopQuery.matches) {
        // Returning to desktop should not reopen the drawer later.
        onCloseRef.current?.();
      } else if (focusInSidebar) {
        // CSS may hide the focused link before the resize event runs.
        document.querySelector(`[aria-controls="${CSS.escape(id)}"]`)?.focus();
      }
    }

    document.addEventListener('focusin', trackFocus);
    desktopQuery.addEventListener('change', handleResize);

    return () => {
      document.removeEventListener('focusin', trackFocus);
      desktopQuery.removeEventListener('change', handleResize);
    };
  }, [id]);

  function handleNavigation(event) {
    if (
      !event.defaultPrevented &&
      event.button === 0 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey &&
      !event.altKey
    ) {
      onClose?.();
    }
  }

  return (
    <Offcanvas
      id={id}
      className="pg-sidebar"
      responsive="lg"
      placement="start"
      show={isOpen}
      onHide={onClose}
      aria-labelledby={`${id}-title`}
      backdropClassName="pg-sidebar-backdrop"
      backdrop
      keyboard
      scroll={false}
      autoFocus
      enforceFocus
      restoreFocus
      restoreFocusOptions={{ preventScroll: true }}
      onEntered={() => closeButtonRef.current?.focus({ preventScroll: true })}
    >
      <div className="pg-sidebar__header">
        <h2 id={`${id}-title`} className="pg-sidebar__title">{navigationLabel}</h2>

        <button
          ref={closeButtonRef}
          type="button"
          className="pg-sidebar__close"
          onClick={onClose}
          aria-label={closeLabel}
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>

      <div className="pg-sidebar__content">
        {account && (
          <div className="pg-sidebar__account">
            {account.avatar ? (
              <img className="pg-sidebar__avatar" src={account.avatar} alt="" />
            ) : (
              <span className="pg-sidebar__avatar" aria-hidden="true">
                <FontAwesomeIcon icon={faUser} />
              </span>
            )}

            <div className="pg-sidebar__account-text">
              <p className="pg-sidebar__name">{account.name}</p>
              {account.role && <p className="pg-sidebar__role">{account.role}</p>}
            </div>
          </div>
        )}

        <nav aria-label={navigationLabel}>
          <ul className="pg-sidebar__list">
            {items.map((item) => (
              <li key={item.id}>
                <NavLink
                  to={item.to}
                  end={item.end ?? false}
                  onClick={handleNavigation}
                  className={({ isActive }) => (
                    `pg-sidebar__link${isActive ? ' pg-sidebar__link--active' : ''}`
                  )}
                >
                  <FontAwesomeIcon
                    icon={item.icon}
                    className="pg-sidebar__icon"
                    aria-hidden="true"
                  />
                  <span className="pg-sidebar__label">{item.label}</span>
                  {item.badge > 0 && (
                    <span className="pg-sidebar__badge">{item.badge}</span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </Offcanvas>
  );
}

export default Sidebar;
