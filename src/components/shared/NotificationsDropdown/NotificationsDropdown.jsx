
import { useId, useRef, useState } from 'react';
import Dropdown from 'react-bootstrap/Dropdown';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBell,
  faBuilding,
  faCalendarDays,
  faChevronRight,
  faChevronUp,
  faGear,
  faStar,
  faUserDoctor,
} from '@fortawesome/free-solid-svg-icons';

import { useLanguage } from '../../../context/LanguageContext.jsx';

import './NotificationsDropdown.css';

// Set the icon and color style for each notification type.
const notificationTypes = {
  center: { icon: faBuilding, tone: 'danger' },
  appointment: { icon: faCalendarDays, tone: 'warning' },
  review: { icon: faStar, tone: 'warning' },
  therapist: { icon: faUserDoctor, tone: 'info' },
  system: { icon: faGear, tone: 'info' },
};

// Control the dropdown position and keep it inside the screen.
const popperConfig = {
  strategy: 'fixed',
  modifiers: [
    { name: 'offset', options: { offset: [0, 12] } },
    {
      name: 'preventOverflow',
      options: {
        padding: 12,
        altAxis: true,
        tether: false,
      },
    },
    { name: 'flip', options: { padding: 12 } },
  ],
};

// Reusable notifications component for Patient, Center, and Admin.
function NotificationsDropdown({
  notifications = [],
  onMarkAsRead,
  onMarkAllAsRead,
  labels = {},
  locale,
}) {
  const { t, language } = useLanguage();

  const resolvedLocale = locale ?? (
    language === 'ar' ? 'ar' : 'en'
  );

  // Store whether the dropdown is open and whether all notifications are shown.
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Keep a reference to the bell button and create unique IDs for accessibility.
  const toggleRef = useRef(null);
  const id = useId();

  // Translated defaults can be overridden by the parent.
  const text = {
    title: t('notifications.title'),
    markAll: t('notifications.markAll'),
    viewAll: t('notifications.viewAll'),
    showLess: t('notifications.showLess'),
    empty: t('notifications.empty'),
    unread: t('notifications.unread'),
    read: t('notifications.read'),
    ...labels,
  };

  // Count only unread notifications to update the number on the bell.
  const unreadCount = notifications.filter(
    (item) => item.isRead === false
  ).length;

  const countLabel =
    `${text.title}: ${unreadCount} ${text.unread}`;

  // Sort notifications from newest to oldest without changing the original array.
  const sortedNotifications = [...notifications].sort(
    (first, second) =>
      new Date(second.createdAt) - new Date(first.createdAt)
  );

  // Show the latest five notifications, or all of them when expanded.
  const visibleNotifications = expanded
    ? sortedNotifications
    : sortedNotifications.slice(0, 5);

  // Open or close the dropdown and reset the expanded view when closing.
  function handleToggle(nextOpen) {
    setOpen(nextOpen);

    if (!nextOpen) {
      setExpanded(false);
    }
  }

  // Close the dropdown with Escape and return focus to the bell button.
  function handleKeyDown(event) {
    // Keep Escape from also closing the Navbar's mobile search.
    if (open && event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      handleToggle(false);
      toggleRef.current?.focus({ preventScroll: true });
    }
  }

  return (
    <Dropdown
      className="pg-notifications"
      show={open}
      onToggle={handleToggle}
      onKeyDown={handleKeyDown}
      autoClose="outside"
      align="end"
      focusFirstItemOnShow
    >
      {/* Bell button used to open and close the notifications dropdown. */}
      <Dropdown.Toggle
        as="button"
        ref={toggleRef}
        id={`${id}-toggle`}
        type="button"
        className="pg-notifications__toggle"
        aria-label={countLabel}
        aria-controls={`${id}-panel`}
      >
        <FontAwesomeIcon icon={faBell} aria-hidden="true" />

        {unreadCount > 0 && (
          <span
            className="pg-notifications__badge"
            aria-hidden="true"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Dropdown.Toggle>

      {/* Announce the unread count to screen readers. */}
      <span className="visually-hidden" role="status">
        {countLabel}
      </span>

      {/* Dropdown panel containing the header, list, and footer. */}
      <Dropdown.Menu
        id={`${id}-panel`}
        className="pg-notifications__menu"
        role="region"
        aria-labelledby={`${id}-title`}
        popperConfig={popperConfig}
        renderOnMount
      >
        <div className="pg-notifications__header">
          <h2 id={`${id}-title`}>
            {text.title}
          </h2>

          <button
            type="button"
            className="dropdown-item pg-notifications__action"
            aria-disabled={unreadCount === 0}
            onClick={() => {
              if (unreadCount > 0) {
                onMarkAllAsRead?.();
              }
            }}
          >
            {text.markAll}
          </button>
        </div>

        <ul
          id={`${id}-list`}
          className="pg-notifications__list"
        >
          {visibleNotifications.length === 0 ? (
            <li className="pg-notifications__empty">
              {text.empty}
            </li>
          ) : (
            visibleNotifications.map((item) => {
              const appearance = notificationTypes[item.type] || {
                icon: faBell,
                tone: 'info',
              };

              const unread = item.isRead === false;

              return (
                <li key={item.id}>
                  <Dropdown.Item
                    as="button"
                    type="button"
                    className="pg-notifications__item"
                    onClick={() => {
                      if (unread) {
                        onMarkAsRead?.(item.id);
                      }
                    }}
                  >
                    <span
                      className={
                        `pg-notifications__icon ` +
                        `pg-notifications__icon--${appearance.tone}`
                      }
                      aria-hidden="true"
                    >
                      <FontAwesomeIcon icon={appearance.icon} />
                    </span>

                    <span className="pg-notifications__text">
                      <strong>{item.title}</strong>
                      <span>{item.message}</span>

                      <time dateTime={item.createdAt}>
                        {item.timeLabel ||
                          new Date(item.createdAt).toLocaleString(
                            resolvedLocale
                          )}
                      </time>

                      <span className="visually-hidden">
                        {unread ? text.unread : text.read}
                      </span>
                    </span>

                    {unread && (
                      <span
                        className="pg-notifications__dot"
                        aria-hidden="true"
                      />
                    )}
                  </Dropdown.Item>
                </li>
              );
            })
          )}
        </ul>

        {notifications.length > 5 && (
          <div className="pg-notifications__footer">
            <Dropdown.Item
              as="button"
              type="button"
              className={
                'pg-notifications__action ' +
                'pg-notifications__expand'
              }
              onClick={() =>
                setExpanded((value) => !value)
              }
              aria-expanded={expanded}
              aria-controls={`${id}-list`}
            >
              {expanded ? text.showLess : text.viewAll}

              <FontAwesomeIcon
                icon={
                  expanded ? faChevronUp : faChevronRight
                }
                className={
                  expanded
                    ? undefined
                    : 'pg-notifications__arrow'
                }
                aria-hidden="true"
              />
            </Dropdown.Item>
          </div>
        )}
      </Dropdown.Menu>
    </Dropdown>
  );
}

export default NotificationsDropdown;
