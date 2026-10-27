import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faStar, faFlag, faComment, faFileAlt } from '@fortawesome/free-solid-svg-icons';
import Button from '../../components/shared/Button/Button.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import './Reviews.css';

function AdminReviews() {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');

  const reviews = [
    { id: 1, name: 'Ahmed Al-Masri', context: 'Reviewed Dr. Lina Haddad - MotionCare Center', text: 'Excellent treatment and professional care. Highly recommended!', rating: 5.0 },
    { id: 2, name: 'Layla Hassan', context: 'Reviewed Dr. Karim Nasser - Al Noor Rehabilitation', text: 'Great experience, very attentive physiotherapist.', rating: 4.5 },
  ];

  return (
    <div className="admin-reviews">
      <header className="admin-list-page__header">
        <div>
          <h1>{t('admin.reviews.title')}</h1>
          <p>{t('admin.reviews.subtitle')}</p>
        </div>
      </header>

      <div className="admin-reviews__summary">
        <div className="admin-summary-card">
          <span>{t('admin.reviews.overallRating')}</span>
          <strong>4.8</strong>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {[1,2,3,4,5].map(i => <FontAwesomeIcon key={i} icon={faStar} style={{ color: '#f59e0b', fontSize: '14px' }} />)}
          </div>
          <small>{t('admin.reviews.reviewsCount', { count: '20,841' })} · {t('admin.reviews.flagged', { count: '0.1%' })}</small>
        </div>
        <div className="admin-summary-card">
          <FontAwesomeIcon icon={faFileAlt} />
          <strong>23,641</strong>
          <span>{t('admin.reviews.published')}</span>
        </div>
        <div className="admin-summary-card">
          <FontAwesomeIcon icon={faComment} />
          <strong>129</strong>
          <span>{t('admin.reviews.pending')}</span>
        </div>
        <div className="admin-summary-card">
          <FontAwesomeIcon icon={faFlag} />
          <strong>44</strong>
          <span>{t('admin.reviews.reported')}</span>
        </div>
      </div>

      <div className="admin-list-page__filters">
        <div className="admin-search">
          <FontAwesomeIcon icon={faSearch} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('admin.reviews.search')} />
        </div>
        <select className="admin-select"><option>{t('admin.allRatings')}</option></select>
        <select className="admin-select"><option>{t('admin.allStatuses')}</option></select>
        <select className="admin-select"><option>{t('admin.newest')}</option></select>
      </div>

      <div className="admin-reviews__list">
        {reviews.map((review) => (
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
            <div className="admin-review-card__actions">
              <Button variant="outline" size="sm">{t('admin.reviews.moderate')}</Button>
              <Button variant="danger" size="sm">{t('admin.reviews.remove')}</Button>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-pagination">
        <span>{t('admin.showing', { start: 1, end: 2, total: t('admin.reviews.total', { total: '23,641' }) })}</span>
        <div className="admin-pagination__pages">
          <button className="is-active">1</button>
          <button>2</button>
          <button>3</button>
        </div>
      </div>
    </div>
  );
}

export default AdminReviews;
