// API records may contain bilingual values; user-entered values are never machine-translated.
export function localized(value, language) {
  if (typeof value === 'string') return value;
  return value?.[language] || value?.en || value?.ar || '';
}
export function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function formatDate(value, language) {
  if (!value) return '—';
  // The API may send an ISO string, a Date or a timestamp; only strings carry
  // the date prefix that keeps the calendar day stable across time zones.
  const text = typeof value === 'string' ? value.slice(0, 10) : value;
  const date = new Date(typeof text === 'string' ? `${text}T12:00:00` : text);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(language, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date);
}
export function money(value, language, currency = 'USD') {
  return new Intl.NumberFormat(language, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(value);
}
export function includesQuery(query, ...values) {
  const needle = query.trim().toLocaleLowerCase();
  return values.some(value => String(value ?? '').toLocaleLowerCase().includes(needle));
}
