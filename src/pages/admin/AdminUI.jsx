import Button from '../../components/shared/Button/Button.jsx';
import Modal from '../../components/shared/Modal/Modal.jsx';
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

  // A fragment keeps multiple children (table + pager) out of a list, which
  // would otherwise ask them for keys.
  return <>{children}</>;
}

// Read-only dialog behind the "View" row action: plain label/value rows, so a
// row can be inspected without leaving the list.
export function RecordDialog({ title, rows = [], onClose }) {
  const { t } = useLanguage();

  return (
    <Modal
      isOpen
      size="sm"
      title={title}
      onClose={onClose}
      footer={
        <Button variant="outline" onClick={onClose}>
          {t('center.close')}
        </Button>
      }
    >
      <dl className="admin-record">
        {rows.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.value === '' || row.value == null ? '—' : row.value}</dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
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
