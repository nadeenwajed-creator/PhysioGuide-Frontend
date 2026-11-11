import { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { localized } from '../../utils/centerFormat.js';
import useAdminQuery from './useAdminQuery.js';
import { QueryState, AdminPagination } from './AdminUI.jsx';
import './ListPages.css';

// Every real platform event the dashboard summarises, newest first, one page at
// a time. The API owns the paging so the total is the whole log, not this page.
function AdminActivity() {
  const { t, language } = useLanguage();
  const [filters, setFilters] = useState({ page: 1, pageSize: 10 });

  const update = (values) => setFilters((previous) => ({ ...previous, ...values }));
  const state = useAdminQuery('getAdminActivity', filters);

  const data = state.data;
  const number = new Intl.NumberFormat(language);
  const timestamp = new Intl.DateTimeFormat(language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  // The API sends UTC timestamps; the browser renders them in local time.
  const when = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : timestamp.format(date);
  };

  return (
    <div className="admin-list-page">
      <header className="admin-list-page__header">
        <div>
          <h1>{t('admin.activity.title')}</h1>
          <p>{t('admin.activity.subtitle')}</p>
        </div>
      </header>

      <div className="admin-table-wrapper">
        <QueryState state={state} empty={!data?.items?.length}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('admin.activity.event')}</th>
                <th>{t('admin.activity.time')}</th>
              </tr>
            </thead>
            <tbody>
              {data?.items?.map((entry) => (
                <tr key={entry.id}>
                  <td>{localized(entry.text, language)}</td>
                  <td>{when(entry.at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <AdminPagination
            page={filters.page}
            pageSize={filters.pageSize}
            total={data?.total ?? 0}
            totalLabel={t('admin.activity.total', { total: number.format(data?.total ?? 0) })}
            onChange={(page) => update({ page })}
            onPageSizeChange={(value) => update({ pageSize: Number(value), page: 1 })}
          />
        </QueryState>
      </div>
    </div>
  );
}

export default AdminActivity;
