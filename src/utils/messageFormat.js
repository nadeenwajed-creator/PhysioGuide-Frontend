export function messageDay(value, language, t, now = new Date()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === now.toDateString()) return t('messaging.today');
  if (date.toDateString() === yesterday.toDateString())
    return t('messaging.yesterday');
  return date.toLocaleDateString(language, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function messageTime(value, language) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' });
}

export function conversationTime(value, language, t) {
  return new Date(value).toDateString() === new Date().toDateString()
    ? messageTime(value, language)
    : messageDay(value, language, t);
}
