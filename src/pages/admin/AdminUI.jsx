import Button from '../../components/shared/Button/Button.jsx';
import { Feedback, EmptyState, Pager } from '../../components/center/CenterUI.jsx';
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

// The center pages' Pager (rows-per-page select, range label, shared
// Pagination control) with the admin's own noun-specific range copy, e.g.
// "Showing 1–10 of 42 patients", all from the list total the backend reports.
export function AdminPagination({
  page,
  pageSize,
  total,
  totalLabel,
  onChange,
  onPageSizeChange,
}) {
  const { t } = useLanguage();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), pages);
  const start = total ? (current - 1) * pageSize + 1 : 0;
  const end = Math.min(current * pageSize, total);

  return (
    <Pager
      page={current}
      total={total}
      onChange={onChange}
      pageSize={pageSize}
      onPageSizeChange={onPageSizeChange}
      rangeLabel={t('admin.showing', { start, end, total: totalLabel })}
    />
  );
}
