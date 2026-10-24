import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import ChatHeader from '../../components/shared/ChatHeader/ChatHeader.jsx';
import MessageBubble from '../../components/shared/MessageBubble/MessageBubble.jsx';
import MessageInput from '../../components/shared/MessageInput/MessageInput.jsx';
import Avatar from '../../components/shared/Avatar/Avatar.jsx';
import { EmptyState, Feedback } from '../../components/center/CenterUI.jsx';
import useCenter from '../../components/center/useCenter.js';
import { useLanguage } from '../../context/LanguageContext.jsx';
import {
  downloadMessageAttachment,
  markConversationRead,
  sendMessage,
} from '../../services/messageService.js';
import { messageDay, messageTime } from '../../utils/messageFormat.js';
import './Messages.css';

function ConversationContent({ conversation }) {
  const { data, actor, name } = useCenter();
  const { language, t } = useLanguage();
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(
    () => document.visibilityState === 'visible'
  );
  const logRef = useRef(null);
  const follow = useRef(true);
  const patient = data.patients.find(
    (person) => person.id === conversation.patientId
  );
  const therapist = data.therapists.find(
    (person) => person.id === conversation.therapistId
  );
  const contact = actor.role === 'patient' ? therapist : patient;
  const self = actor.role === 'patient' ? patient : therapist;
  const unread = JSON.stringify(
    conversation.messages
      .filter((message) => !message.isRead)
      .map((message) => message.id)
  );
  useEffect(() => {
    const update = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  useEffect(() => {
    if (!visible || unread === '[]') return;
    let active = true;
    markConversationRead(actor, conversation.id, JSON.parse(unread)).catch(
      () => {
        if (active) setError('messaging.readError');
      }
    );
    return () => {
      active = false;
    };
  }, [actor, conversation.id, unread, visible]);
  useEffect(() => {
    if (follow.current && logRef.current)
      logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [conversation.messages.length]);
  async function attachment(file) {
    try {
      await downloadMessageAttachment(file);
    } catch {
      setError('messaging.attachmentError');
    }
  }
  return (
    <section
      className="portal-conversation__panel"
      aria-label={t('messaging.conversationWith', {
        name: name(contact?.name),
      })}
    >
      <ChatHeader
        name={name(contact?.name)}
        avatarSrc={contact?.imageUrl}
        showBack={false}
        showProfileAction={false}
        showPresence={false}
        roleLabel={t(
          actor.role === 'patient'
            ? 'center.therapistProfile.role'
            : 'messaging.patient'
        )}
      />
      <div
        className="portal-conversation__log"
        ref={logRef}
        role="log"
        aria-live="polite"
        aria-label={t('messaging.title')}
        onScroll={() => {
          const log = logRef.current;
          follow.current =
            log.scrollHeight - log.scrollTop - log.clientHeight < 80;
        }}
      >
        {!conversation.messages.length && (
          <EmptyState>{t('messaging.noMessages')}</EmptyState>
        )}
        {conversation.messages.map((message, index) => {
          const day = messageDay(message.sentAt, language, t);
          const separator =
            index === 0 ||
            day !==
              messageDay(conversation.messages[index - 1].sentAt, language, t);
          const outgoing = message.direction === 'outgoing';
          const author = outgoing ? self : contact;
          return (
            <div key={message.id}>
              {separator && (
                <div className="portal-conversation__date">
                  <span>{day}</span>
                </div>
              )}
              <div
                className={`portal-conversation__row${outgoing ? ' portal-conversation__row--outgoing' : ''}`}
              >
                <Avatar
                  src={author?.imageUrl}
                  name={name(author?.name)}
                  size="sm"
                />
                <MessageBubble
                  message={{
                    ...message,
                    text: name(message.text),
                    time: messageTime(message.sentAt, language),
                  }}
                  onOpenAttachment={attachment}
                  onDownloadAttachment={attachment}
                />
              </div>
            </div>
          );
        })}
      </div>
      <Feedback error>{error ? t(error) : ''}</Feedback>
      <MessageInput
        enableEmoji
        onSend={async (payload) => {
          follow.current = true;
          await sendMessage(actor, conversation.id, payload);
        }}
      />
    </section>
  );
}

export default function Conversation() {
  const { conversationId } = useParams();
  const { data, actor } = useCenter();
  const { t, dir } = useLanguage();
  const base =
    actor.role === 'patient'
      ? '/patient/messages'
      : '/center/physiotherapist/messages';
  const conversation = data.conversations.find(
    (item) => item.id === conversationId
  );
  return (
    <div className="portal-conversation">
      <h1 className="visually-hidden">{t('messaging.title')}</h1>
      <Link className="portal-conversation__back" to={base}>
        <FontAwesomeIcon icon={dir === 'rtl' ? faArrowRight : faArrowLeft} />
        {t('messaging.back')}
      </Link>
      {conversation ? (
        <ConversationContent
          key={`${actor.id}:${conversation.id}`}
          conversation={conversation}
        />
      ) : (
        <Feedback error>{t('messaging.notFound')}</Feedback>
      )}
    </div>
  );
}
