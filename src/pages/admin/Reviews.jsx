import { useState, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faStar, faFlag, faComment, faFileAlt } from '@fortawesome/free-solid-svg-icons';
import Button from '../../components/shared/Button/Button.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { callAdmin } from '../../services/adminService.js';
import useAdminQuery, { useDebouncedValue } from './useAdminQuery.js';
import { QueryState, AdminPagination } from './AdminUI.jsx';
import { formatDate } from '../../utils/centerFormat.js';
import './Reviews.css';

function AdminReviews() {
  const { t, language } = useLanguage();
  const [filters, setFilters] = useState({
    search: '',
    rating: '',
    status: '',
    sort: '',
    page: 1,
    pageSize: 5,
  });

  const update = (values) =>
    setFilters((previous) => ({
      ...previous,
      ...values,
      ...('page' in values ? {} : { page: 1 }),
    }));

  const search = useDebouncedValue(filters.search, 300);
  const state = useAdminQuery('getAdminReviews', { ...filters, search });

  const data = state.data;
  const summary = data?.summary ?? {};
  const number = new Intl.NumberFormat(language);
  const decimal = new Intl.NumberFormat(language, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  const moderate = useCallback(
    async (id, action) => {
      try {
        await callAdmin('moderateAdminReview', { id, action });
        state.reload();
      } catch {
        // swallow — the reload will show the current state
      }
    },
    [state],
  );

  return (
    <div className="admin-reviews">
      <header className="admin-list-page__header">
        <div>
          <h1>{t('admin.reviews.title')}</h1>
          <p>{t('admin.reviews.subtitle')}</p>
        </div>
      </header>

      <QueryState state={state}>
        <div className="admin-reviews__summary">
          <div className="admin-summary-card">
            <span>{t('admin.reviews.overallRating')}</span>
            <strong>{decimal.format(summary.score ?? 0)}</strong>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <FontAwesomeIcon
                  key={i}
                  icon={faStar}
                  style={{ color: '#f59e0b', fontSize: '14px' }}
                />
              ))}
            </div>
            <small>
              {t('admin.reviews.reviewsCount', {
                count: number.format(summary.total ?? 0),
              })}{' '}
              · {t('admin.reviews.flagged', { count: summary.flaggedPercent ?? '0%' })}
            </small>
          </div>
          <div className="admin-summary-card">
            <FontAwesomeIcon icon={faFileAlt} />
            <strong>{number.format(summary.published ?? 0)}</strong>
            <span>{t('admin.reviews.published')}</span>
          </div>
          <div className="admin-summary-card">
            <FontAwesomeIcon icon={faComment} />
            <strong>{number.format(summary.pending ?? 0)}</strong>
            <span>{t('admin.reviews.pending')}</span>
          </div>
          <div className="admin-summary-card">
            <FontAwesomeIcon icon={faFlag} />
            <strong>{number.format(summary.reported ?? 0)}</strong>
            <span>{t('admin.reviews.reported')}</span>
          </div>
        </div>

        <div className="admin-list-page__filters">
          <div className="admin-search">
            <FontAwesomeIcon icon={faSearch} />
            <input
              value={filters.search}
              onChange={(e) => update({ search: e.target.value })}
              placeholder={t('admin.reviews.search')}
            />
          </div>
          <select
            className="admin-select"
            value={filters.rating}
            onChange={(e) => update({ rating: e.target.value })}
          >
            <option value="">{t('admin.allRatings')}</option>
            {[5, 4, 3, 2, 1].map((r) => (
              <option key={r} value={r}>
                {'★'.repeat(r)} ({r})
              </option>
            ))}
          </select>
          <select
            className="admin-select"
            value={filters.status}
            onChange={(e) => update({ status: e.target.value })}
          >
            <option value="">{t('admin.allStatuses')}</option>
            <option value="published">{t('admin.reviews.published')}</option>
            <option value="pending">{t('admin.reviews.pending')}</option>
            <option value="reported">{t('admin.reviews.reported')}</option>
          </select>
          <select
            className="admin-select"
            value={filters.sort}
            onChange={(e) => update({ sort: e.target.value })}
          >
            <option value="">{t('admin.newest')}</option>
            <option value="oldest">Oldest</option>
            <option value="highest">Highest rated</option>
          </select>
        </div>

        <div className="admin-reviews__list">
          {(data?.items ?? []).map((review) => (
            <div key={review.id} className="admin-review-card">
              <div className="admin-review-card__header">
                <div>
                  <strong>{review.name}</strong>
                  <span>{review.context}</span>
                </div>
                <span className="admin-review-card__rating">
                  <FontAwesomeIcon icon={faStar} style={{ color: '#f59e0b' }} />
                  {review.rating}
                </span>
              </div>
              <p className="admin-review-card__text">"{review.text}"</p>
              {review.createdAt && (
                <small className="admin-review-card__date">
                  {formatDate(review.createdAt, language)}
                </small>
              )}
              {review.status && (
                <span
                  className={`admin-badge admin-badge--${review.status}`}
                  style={{ alignSelf: 'flex-start', marginBottom: '8px' }}
                >
                  {review.status}
                </span>
              )}
              <div className="admin-review-card__actions">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => moderate(review.id, 'approve')}
                >
                  {t('admin.reviews.moderate')}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => moderate(review.id, 'remove')}
                >
                  {t('admin.reviews.remove')}
                </Button>
              </div>
            </div>
          ))}
        </div>

        <AdminPagination
          page={filters.page}
          pageSize={filters.pageSize}
          total={data?.total ?? 0}
          totalLabel={t('admin.reviews.total', {
            total: number.format(data?.total ?? 0),
          })}
          onChange={(page) => update({ page })}
        />
      </QueryState>
    </div>
  );
}

export default AdminReviews;
