import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import ConversationList from '../../components/shared/ConversationList/ConversationList.jsx';
import SearchBar from '../../components/shared/SearchBar/SearchBar.jsx';
import { PageHeader } from '../../components/center/CenterUI.jsx';
import useCenter from '../../components/center/useCenter.js';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { conversationTime } from '../../utils/messageFormat.js';
import './Messages.css';

export default function Messages() {
  const { data, actor, name } = useCenter();
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [search, setSearch] = useState('');
  const base =
    actor.role === 'patient'
      ? '/patient/messages'
      : '/center/physiotherapist/messages';
  // Existing notification links remain valid, including unknown IDs handled by Conversation.
  if (params.get('conversation'))
    return (
      <Navigate
        to={`${base}/${encodeURIComponent(params.get('conversation'))}`}
        replace
      />
    );
  const list = [...data.conversations].sort(
    (a, b) =>
      new Date(b.messages.at(-1)?.sentAt || 0) -
      new Date(a.messages.at(-1)?.sentAt || 0)
  );
  const conversations = list
    .map((conversation) => {
      const contact =
        actor.role === 'patient'
          ? data.therapists.find(
              (person) => person.id === conversation.therapistId
            )
          : data.patients.find(
              (person) => person.id === conversation.patientId
            );
      const last = conversation.messages.at(-1);
      return {
        id: conversation.id,
        name: name(contact?.name) || t('messaging.contact'),
        avatarSrc: contact?.imageUrl,
        lastMessage: last
          ? name(last.text) || t('messaging.attachment')
          : t('messaging.noMessages'),
        time: last ? conversationTime(last.sentAt, language, t) : '',
        unreadCount: conversation.unreadCount,
        messageStatus: last?.direction === 'outgoing' ? last.status : undefined,
        searchName: [name(contact?.name), contact?.name?.en, contact?.name?.ar]
          .join(' ')
          .toLocaleLowerCase(),
      };
    })
    .filter((conversation) =>
      conversation.searchName.includes(search.trim().toLocaleLowerCase())
    );
  return (
    <div className="portal-messages">
      <PageHeader
        title={t('messaging.title')}
        description={t(
          actor.role === 'patient'
            ? 'messaging.patientSubtitle'
            : 'messaging.subtitle'
        )}
      />
      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder={t('messaging.search')}
        ariaLabel={t('messaging.search')}
      />
      <ConversationList
        conversations={conversations}
        onSelect={(id) => navigate(`${base}/${encodeURIComponent(id)}`)}
        emptyMessage={t(
          search.trim() ? 'messaging.noResults' : 'messaging.empty'
        )}
      />
    </div>
  );
}
