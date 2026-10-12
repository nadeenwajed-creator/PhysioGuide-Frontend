import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';

import './MessageBubble.css';

function MessageBubble({
  message,
  sentLabel,
  deliveredLabel,
  className = '',
}) {
  const text = typeof message?.text === 'string' ? message.text : '';

  // Attachment-only messages are not supported in this phase.
  if (!text.trim()) {
    return null;
  }

  const isOutgoing = message.direction === 'outgoing';
  const showStatus = isOutgoing &&
    ['sent', 'delivered'].includes(message.status);

  const statusLabel = message.status === 'sent'
    ? sentLabel
    : deliveredLabel;

  const bubbleClasses = [
    'pg-message-bubble',
    isOutgoing
      ? 'pg-message-bubble--outgoing'
      : 'pg-message-bubble--incoming',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={bubbleClasses}>
      <div className="pg-message-bubble__body">
        <p className="pg-message-bubble__text" dir="auto">
          {text}
        </p>

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