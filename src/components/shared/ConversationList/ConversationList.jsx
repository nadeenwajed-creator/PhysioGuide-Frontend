import ConversationItem from '../ConversationItem/ConversationItem';
import './ConversationList.css';

function ConversationList({
  conversations = [],
  selectedConversationId,
  onSelect,
  emptyMessage,
  className = '',
}) {
  const listClasses = [
    'pg-conversation-list',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={listClasses}>
      {conversations.length === 0 ? (
        emptyMessage && (
          <p className="pg-conversation-list__empty">
            {emptyMessage}
          </p>
        )
      ) : (
        <ul className="pg-conversation-list__items" role="list">
          {conversations.map((conversation) => (
            <li
              key={conversation.id}
              className="pg-conversation-list__item"
            >
              <ConversationItem
                name={conversation.name}
                avatarSrc={conversation.avatarSrc}
                lastMessage={conversation.lastMessage}
                time={conversation.time}
                unreadCount={conversation.unreadCount}
                messageStatus={conversation.messageStatus}
                unreadLabel={conversation.unreadLabel}
                messageStatusLabel={conversation.messageStatusLabel}
                isActive={conversation.id === selectedConversationId}
                onClick={() => onSelect?.(conversation.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ConversationList;