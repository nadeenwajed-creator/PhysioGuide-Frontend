
import { useId, useRef, useState } from 'react';
import Dropdown from 'react-bootstrap/Dropdown';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBell, faBuilding, faCalendarDays, faChevronRight,
  faChevronUp, faGear, faStar, faUserDoctor,
} from '@fortawesome/free-solid-svg-icons';

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
    { name: 'preventOverflow', options: { padding: 12, altAxis: true, tether: false } },
    { name: 'flip', options: { padding: 12 } },
  ],
};

// Reusable notifications component for Patient, Center, and Admin.
function NotificationsDropdown({
  notifications = [],
  onMarkAsRead,
  onMarkAllAsRead,
  labels = {},
  locale = 'en',
}) {
  // Store whether the dropdown is open and whether all notifications are shown.
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Keep a reference to the bell button and create unique IDs for accessibility.
  const toggleRef = useRef(null);
  const id = useId();

  // Default English labels can be replaced by translated labels from the parent.
  const text = {
    title: 'Notifications',
    markAll: 'Mark all as read',
    viewAll: 'View all notifications',
    showLess: 'Show less',
    empty: 'No notifications yet',
    unread: 'unread',
    read: 'Read',
    ...labels,
  };

  // Count only unread notifications to update the number on the bell.
  const unreadCount = notifications.filter((item) => item.isRead === false).length;
  const countLabel = `${text.title}: ${unreadCount} ${text.unread}`;

  // Sort notifications from newest to oldest without changing the original array.
  const sortedNotifications = [...notifications].sort(
    (first, second) => new Date(second.createdAt) - new Date(first.createdAt)
  );

  // Show the latest five notifications, or all of them when expanded.
  const visibleNotifications = expanded
    ? sortedNotifications
    : sortedNotifications.slice(0, 5);

  // Open or close the dropdown and reset the expanded view when closing.
  function handleToggle(nextOpen) {
    setOpen(nextOpen);
    if (!nextOpen) setExpanded(false);
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
    // React Bootstrap handles the dropdown and outside-click behavior.
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

        {/* Show the unread count only when there are unread notifications. */}
        {unreadCount > 0 && (
          <span className="pg-notifications__badge" aria-hidden="true">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Dropdown.Toggle>

      {/* Announce the unread count to screen readers. */}
      <span className="visually-hidden" role="status">{countLabel}</span>

      {/* Dropdown panel containing the header, notification list, and footer. */}
      <Dropdown.Menu
        id={`${id}-panel`}
        className="pg-notifications__menu"
        role="region"
        aria-labelledby={`${id}-title`}
        popperConfig={popperConfig}
        renderOnMount
      >
        {/* Header with the title and Mark all as read button. */}
        <div className="pg-notifications__header">
          <h2 id={`${id}-title`}>{text.title}</h2>

          {/* Mark all notifications as read without deleting them. */}
          <button
            type="button"
            className="dropdown-item pg-notifications__action"
            aria-disabled={unreadCount === 0}
            onClick={() => {
              if (unreadCount > 0) onMarkAllAsRead?.();
            }}
          >
            {text.markAll}
          </button>
        </div>

        {/* Display the notifications or an empty message if the list is empty. */}
        <ul id={`${id}-list`} className="pg-notifications__list">
          {visibleNotifications.length === 0 ? (
            <li className="pg-notifications__empty">{text.empty}</li>
          ) : visibleNotifications.map((item) => {
            // Choose the notification icon and check whether it is unread.
            const appearance = notificationTypes[item.type] || { icon: faBell, tone: 'info' };
            const unread = item.isRead === false;

            return (
              <li key={item.id}>
                {/* Clicking a notification marks it as read without opening another page. */}
                <Dropdown.Item
                  as="button"
                  type="button"
                  className="pg-notifications__item"
                  onClick={() => {
                    if (unread) onMarkAsRead?.(item.id);
                  }}
                >
                  {/* Icon and background color based on the notification type. */}
                  <span
                    className={`pg-notifications__icon pg-notifications__icon--${appearance.tone}`}
                    aria-hidden="true"
                  >
                    <FontAwesomeIcon icon={appearance.icon} />
                  </span>

                  {/* Notification title, message, date, and read status. */}
                  <span className="pg-notifications__text">
                    <strong>{item.title}</strong>
                    <span>{item.message}</span>

                    {/* Use a custom time label if available, otherwise format the date. */}
                    <time dateTime={item.createdAt}>
                      {item.timeLabel || new Date(item.createdAt).toLocaleString(locale)}
                    </time>

                    {/* Read status for screen readers only. */}
                    <span className="visually-hidden">{unread ? text.unread : text.read}</span>
                  </span>

                  {/* Green dot appears only for unread notifications. */}
                  {unread && <span className="pg-notifications__dot" aria-hidden="true" />}
                </Dropdown.Item>
              </li>
            );
          })}
        </ul>

        {/* Show the expand button only when there are more than five notifications. */}
        {notifications.length > 5 && (
          <div className="pg-notifications__footer">
            <Dropdown.Item
              as="button"
              type="button"
              className="pg-notifications__action pg-notifications__expand"
              onClick={() => setExpanded((value) => !value)}
              aria-expanded={expanded}
              aria-controls={`${id}-list`}
            >
              {/* Switch between showing all notifications and the first five. */}
              {expanded ? text.showLess : text.viewAll}

              {/* Change the arrow icon depending on the expanded state. */}
              <FontAwesomeIcon
                icon={expanded ? faChevronUp : faChevronRight}
                className={expanded ? undefined : 'pg-notifications__arrow'}
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
