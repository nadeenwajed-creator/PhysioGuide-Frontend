
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';

import { useLanguage } from '../../../context/LanguageContext.jsx';
import AttachmentCard from '../AttachmentCard/AttachmentCard.jsx';

import './MessageBubble.css';

function MessageBubble({
  message,
  sentLabel,
  deliveredLabel,
  className = '',
  onOpenAttachment,
  onDownloadAttachment,
}) {
  const { t } = useLanguage();

  const text = typeof message?.text === 'string' ? message.text : '';
  const hasText = Boolean(text.trim());

  // AttachmentCard handles file types, sizes, and available actions.
  const attachments = Array.isArray(message?.attachments)
    ? message.attachments.filter((attachment) => (
      attachment !== null
      && typeof attachment === 'object'
      && !Array.isArray(attachment)
      && typeof attachment.name === 'string'
      && attachment.name.trim().length > 0
    ))
    : [];

  const hasAttachments = attachments.length > 0;

  if (!hasText && !hasAttachments) {
    return null;
  }

  const isOutgoing = message.direction === 'outgoing';

  const showStatus = isOutgoing &&
    ['sent', 'delivered'].includes(message.status);

  const statusLabel = message.status === 'sent'
    ? sentLabel ?? t('messageBubble.sent')
    : deliveredLabel ?? t('messageBubble.delivered');

  const bubbleClasses = [
    'pg-message-bubble',
    isOutgoing
      ? 'pg-message-bubble--outgoing'
      : 'pg-message-bubble--incoming',
    hasAttachments && 'pg-message-bubble--with-attachments',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={bubbleClasses}>
      <div className="pg-message-bubble__body">
        {hasText && (
          <p className="pg-message-bubble__text" dir="auto">
            {text}
          </p>
        )}

        {hasAttachments && (
          <ul className="pg-message-bubble__attachments" role="list">
            {attachments.map((attachment, index) => (
              <li
                key={attachment.id != null
                  ? `id:${attachment.id}`
                  : `index:${index}`}
                className="pg-message-bubble__attachment"
              >
                <AttachmentCard
                  variant="sent"
                  file={attachment}
                  onOpen={onOpenAttachment}
                  onDownload={onDownloadAttachment}
                />
              </li>
            ))}
          </ul>
        )}

        <div className="pg-message-bubble__meta">
          <bdi className="pg-message-bubble__time">
            {message.time}
          </bdi>

          {showStatus && (
            <span
              className={[
                'pg-message-bubble__status',
                `pg-message-bubble__status--${message.status}`,
              ].join(' ')}
            >
              <span
                className="pg-message-bubble__checks"
                aria-hidden="true"
              >
                <FontAwesomeIcon
                  icon={faCheck}
                  aria-hidden="true"
                />

                {message.status === 'delivered' && (
                  <FontAwesomeIcon
                    icon={faCheck}
                    aria-hidden="true"
                  />
                )}
              </span>

              {statusLabel && (
                <span className="pg-message-bubble__sr-only">
                  {statusLabel}
                </span>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default MessageBubble;
