
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheck,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons';

import { useLanguage } from '../../../context/LanguageContext.jsx';
import Avatar from '../Avatar/Avatar';

import './ConversationItem.css';

function ConversationItem({
  name,
  avatarSrc,
  lastMessage,
  time,
  unreadCount = 0,
  messageStatus,
  isActive = false,
  onClick,
  className = '',
  unreadLabel,
  messageStatusLabel,
}) {
  const { t } = useLanguage();

  const hasUnread = Number.isSafeInteger(unreadCount) && unreadCount > 0;

  const hasMessageStatus = ['sent', 'delivered', 'read'].includes(
    messageStatus
  );

  const showMessageStatus = hasMessageStatus && !hasUnread;

  const resolvedUnreadLabel = unreadLabel ??
    t('conversationItem.unreadCount', { count: unreadCount });

  const resolvedMessageStatusLabel = hasMessageStatus
    ? messageStatusLabel ?? t(`conversationItem.${messageStatus}`)
    : undefined;

  const itemClasses = [
    'pg-conversation-item',
    isActive && 'pg-conversation-item--active',
    hasUnread && 'pg-conversation-item--unread',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={itemClasses}
      onClick={onClick}
      aria-current={isActive ? 'true' : undefined}
    >
      <Avatar
        src={avatarSrc}
        name={name}
        alt=""
        size="md"
        className="pg-conversation-item__avatar"
      />

      <span className="pg-conversation-item__content">
        <span className="pg-conversation-item__text">
          <bdi className="pg-conversation-item__name">
            {name}
          </bdi>

          {lastMessage && (
            <bdi className="pg-conversation-item__message">
              {lastMessage}
            </bdi>
          )}
        </span>

        {(time || hasUnread || showMessageStatus) && (
          <span className="pg-conversation-item__meta">
            {time && (
              <bdi className="pg-conversation-item__time">
                {time}
              </bdi>
            )}

            {hasUnread && (
              <span className="pg-conversation-item__unread">
                <bdi dir="ltr" aria-hidden="true">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </bdi>

                <span className="pg-conversation-item__sr-only">
                  {resolvedUnreadLabel}
                </span>
              </span>
            )}

            {showMessageStatus && (
              <span
                className={[
                  'pg-conversation-item__status',
                  `pg-conversation-item__status--${messageStatus}`,
                ].join(' ')}
              >
                <span
                  className="pg-conversation-item__checks"
                  aria-hidden="true"
                >
                  <FontAwesomeIcon
                    icon={faCheck}
                    aria-hidden="true"
                  />

                  {messageStatus !== 'sent' && (
                    <FontAwesomeIcon
                      icon={faCheck}
                      aria-hidden="true"
                    />
                  )}
                </span>

                <span className="pg-conversation-item__sr-only">
                  {resolvedMessageStatusLabel}
                </span>
              </span>
            )}
          </span>
        )}
      </span>

      <FontAwesomeIcon
        icon={faChevronRight}
        className="pg-conversation-item__arrow"
        aria-hidden="true"
      />
    </button>
  );
}

export default ConversationItem;
