import { useState } from 'react';
import Avatar from '../../components/shared/Avatar/Avatar.jsx';
import RatingStars from '../../components/shared/RatingStars/RatingStars.jsx';
import Button from '../../components/shared/Button/Button.jsx';
import { PageHeader, Panel, Pager, EmptyState, TextDialog } from '../../components/center/CenterUI.jsx';
import useCenter from '../../components/center/useCenter.js';
import usePagination from '../../components/center/usePagination.js';
import { formatDate } from '../../utils/centerFormat.js';
import { getReviewStatistics, replyToCenterReview } from '../../services/centerRemainingService.js';
import '../../components/center/remaining/RemainingUI.css';
import './Reviews.css';

export default function Reviews() {
  const { data, actor, tr, name, language, notify } = useCenter();
  const [editing, setEditing] = useState(null);
  const statistics = getReviewStatistics(data);
  const reviews = [...data.reviews].sort((a, b) => b.date.localeCompare(a.date));
  const { page, setPage, pageSize, setPageSize, start } = usePagination(reviews.length);
  const number = new Intl.NumberFormat(language, { maximumFractionDigits: 1 });
  return <div className="center-remaining center-reviews">
    <PageHeader title={tr('reviewsTitle')} description={tr('reviewsDescription')} />
    <div className="center-reviews__summary">
      <Panel title={tr('overallRating')}>
        <div className="center-reviews__average"><strong>{statistics.count ? number.format(statistics.average) : '—'}</strong><RatingStars rating={statistics.average} size="md" /></div>
        <p>{tr('basedOnReviews', { count: number.format(statistics.count) })}</p>
      </Panel>
      <Panel title={tr('ratingDistribution')}><div className="center-reviews__distribution">
        {statistics.distribution.map(({ rating, percentage }) => <div key={rating}>
          <span>{tr('stars', { count: number.format(rating) })}</span>
          <meter min="0" max="100" value={percentage} aria-label={tr('ratingPercent', { rating: number.format(rating), percentage: number.format(percentage) })} />
          <span>{new Intl.NumberFormat(language, { style: 'percent', maximumFractionDigits: 0 }).format(percentage / 100)}</span>
        </div>)}
      </div></Panel>
    </div>
    <h2 className="center-reviews__heading">{tr('recentReviews')}</h2>
    <div className="center-reviews__list">{reviews.slice(start, start + pageSize).map(review => {
      const patient = data.patients.find(item => item.id === review.patientId);
      const patientName = name(patient?.name) || tr('remaining.patient');
      return <article className="center-panel center-reviews__item" key={review.id}>
        <Avatar src={patient?.imageUrl} name={patientName} size="sm" />
        <div className="center-reviews__content">
          <div className="center-reviews__identity"><h3>{patientName}</h3><time dateTime={review.date}>{formatDate(review.date, language)}</time></div>
          <RatingStars rating={review.rating} />
          <p>{name(review.text)}</p>
          {review.reply && <div className="center-reviews__reply"><strong>{name(data.center.name)}</strong><p dir="auto">{review.reply}</p></div>}
          {actor.role === 'center' && <Button variant="ghost" onClick={() => setEditing(review)}>{tr(review.reply ? 'editReply' : 'reply')}</Button>}
        </div>
      </article>;
    })}</div>
    {!reviews.length && <EmptyState>{tr('noReviews')}</EmptyState>}
    <Pager page={page} total={reviews.length} onChange={setPage} pageSize={pageSize} onPageSizeChange={setPageSize} />
    {editing && <TextDialog title={tr(editing.reply ? 'editReply' : 'reply')} label={tr('yourReply')} initialValue={editing.reply || ''} onClose={() => setEditing(null)} onSave={async text => {
      await replyToCenterReview(actor, editing.id, text);
      notify(tr('saved'));
    }} />}
  </div>;
}
