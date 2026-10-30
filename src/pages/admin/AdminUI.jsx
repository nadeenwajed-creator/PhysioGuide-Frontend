import Button from '../../components/shared/Button/Button.jsx';
import { Feedback, EmptyState } from '../../components/center/CenterUI.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { errorText } from './useAdminQuery.js';

// Renders the loading, error (with retry) and empty states of one admin query;
// children render once data is present.
export function QueryState({ state, empty = false, children }) {
  const { t } = useLanguage();

  if (state.error) {
    return (
      <div className="admin-state">
        <Feedback error>{errorText(t, state.error)}</Feedback>
        <Button variant="outline" onClick={state.reload}>
          {t('admin.state.retry')}
        </Button>
      </div>
    );
  }

  if (state.loading) {
    return (
      <p className="admin-state" role="status">
        {t('admin.state.loading')}
      </p>
    );
  }

  if (empty) return <EmptyState>{t('admin.state.empty')}</EmptyState>;

  return children;
}

// Range label plus a windowed page list with prev/next, all from the list
// total the backend reports. `totalLabel` is the localized, formatted total.
export function AdminPagination({ page, pageSize, total, totalLabel, onChange }) {
  const { t } = useLanguage();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), pages);
  const start = total ? (current - 1) * pageSize + 1 : 0;
  const end = Math.min(current * pageSize, total);

  if (pages <= 1) {
    return (
      <div className="admin-pagination">
        <span>{t('admin.showing', { start, end, total: totalLabel })}</span>
      </div>
    );
  }

  const windowStart = Math.max(1, Math.min(current - 2, pages - 4));
  const visible = Array.from({ length: Math.min(5, pages) }, (_, index) => windowStart + index);

  return (
    <div className="admin-pagination">
      <span>{t('admin.showing', { start, end, total: totalLabel })}</span>
      <div className="admin-pagination__pages">
        <button
          type="button"
          aria-label={t('admin.pagination.prev')}
          disabled={current <= 1}
          onClick={() => onChange(current - 1)}
        >
          ‹
        </button>
        {visible.map((value) => (
          <button
            key={value}
            type="button"
            className={value === current ? 'is-active' : ''}
            aria-current={value === current ? 'page' : undefined}
            onClick={() => onChange(value)}
          >
            {value}
          </button>
        ))}
        <button
          type="button"
          aria-label={t('admin.pagination.next')}
          disabled={current >= pages}
          onClick={() => onChange(current + 1)}
        >
          ›
        </button>
      </div>
    </div>
  );
}
