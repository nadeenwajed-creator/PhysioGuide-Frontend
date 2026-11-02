import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFlag, faComment, faFileAlt } from '@fortawesome/free-solid-svg-icons';
import Button from '../../components/shared/Button/Button.jsx';
import FilterSelect from '../../components/shared/FilterSelect/FilterSelect.jsx';
import RatingStars from '../../components/shared/RatingStars/RatingStars.jsx';
import SearchBar from '../../components/shared/SearchBar/SearchBar.jsx';
import StatusBadge from '../../components/shared/StatusBadge/StatusBadge.jsx';
import { ConfirmDialog } from '../../components/center/CenterUI.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { callAdmin } from '../../services/adminService.js';
import useAdminQuery, { useDebouncedValue } from './useAdminQuery.js';
import { QueryState, AdminPagination } from './AdminUI.jsx';
import { formatDate } from '../../utils/centerFormat.js';
import './Reviews.css';

const reviewStatuses = ['published', 'pending', 'reported'];

function AdminReviews() {
  const { t, language } = useLanguage();
  const [filters, setFilters] = useState({
    search: '',
    rating: '',
    status: '',
    sort: '',
    page: 1,
    pageSize: 10,
  });
  const [pending, setPending] = useState(null);

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

  // Throwing lets the confirmation dialog keep itself open and show the failure.
  async function moderate() {
    await callAdmin('moderateAdminReview', { id: pending.id, action: pending.action });
    state.reload();
  }

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
            <RatingStars rating={summary.score ?? 0} />
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
          <SearchBar
            value={filters.search}
            onChange={(value) => update({ search: value })}
            placeholder={t('admin.reviews.search')}
            ariaLabel={t('admin.reviews.search')}
          />
          <FilterSelect
            value={filters.rating}
            onChange={(value) => update({ rating: value })}
            ariaLabel={t('admin.allRatings')}
            options={[
              { value: '', label: t('admin.allRatings') },
              ...[5, 4, 3, 2, 1].map((rating) => ({
                value: String(rating),
                label: `${'★'.repeat(rating)} (${rating})`,
              })),
            ]}
          />
          <FilterSelect
            value={filters.status}
            onChange={(value) => update({ status: value })}
            ariaLabel={t('admin.allStatuses')}
            options={[
              { value: '', label: t('admin.allStatuses') },
              ...reviewStatuses.map((status) => ({
                value: status,
                label: t(`admin.status.${status}`),
              })),
            ]}
          />
          <FilterSelect
            value={filters.sort}
            onChange={(value) => update({ sort: value })}
            ariaLabel={t('admin.newest')}
            options={[
              { value: '', label: t('admin.newest') },
              { value: 'oldest', label: t('admin.oldest') },
              { value: 'highest', label: t('admin.highestRating') },
            ]}
          />
        </div>

        <div className="admin-reviews__list">
          {(data?.items ?? []).map((review) => (
            <div key={review.id} className="admin-review-card">
              <div className="admin-review-card__header">
                <div>
                  <strong>{review.name}</strong>
                  {review.context && <span>{review.context}</span>}
                </div>
                <span className="admin-review-card__rating">
                  <RatingStars rating={review.rating} showValue />
                </span>
              </div>
              <p className="admin-review-card__text">"{review.text}"</p>
              {review.createdAt && (
                <small className="admin-review-card__date">
                  {formatDate(review.createdAt, language)}
                </small>
              )}
              <StatusBadge status={review.status} className="admin-review-card__status">
                {t(`admin.status.${review.status}`)}
              </StatusBadge>
              <div className="admin-review-card__actions">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPending({ id: review.id, action: 'approve' })}
                >
                  {t('admin.reviews.moderate')}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setPending({ id: review.id, action: 'remove' })}
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
          onPageSizeChange={(value) => update({ pageSize: Number(value) })}
        />
      </QueryState>

      {pending && (
        <ConfirmDialog
          title={pending.action === 'remove' ? t('admin.reviews.remove') : t('admin.reviews.moderate')}
          description={
            pending.action === 'remove'
              ? t('admin.reviews.confirmRemove')
              : t('admin.reviews.confirmModerate')
          }
          danger={pending.action === 'remove'}
          onClose={() => setPending(null)}
          onConfirm={moderate}
        />
      )}
    </div>
  );
}

export default AdminReviews;
