import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { faPen } from '@fortawesome/free-solid-svg-icons';
import Button from '../../components/shared/Button/Button.jsx';
import Modal from '../../components/shared/Modal/Modal.jsx';
import RatingStars from '../../components/shared/RatingStars/RatingStars.jsx';
import { PageHeader, Panel, PageLink, RecordImage, EmptyState } from '../../components/center/CenterUI.jsx';
import LocationPanel from '../../components/center/remaining/LocationPanel.jsx';
import useCenter from '../../components/center/useCenter.js';
import { getReviewStatistics } from '../../services/centerRemainingService.js';
import { money } from '../../utils/centerFormat.js';
import '../../components/center/remaining/RemainingUI.css';
import './CenterProfile.css';

export default function CenterProfile() {
  const { data, name, tr, language, dir } = useCenter();
  const navigate = useNavigate();
  const [photo, setPhoto] = useState(null);
  const center = data.center;
  const gallery = [...new Set(center.gallery || [])];
  const services = data.services.filter(service => service.status === 'active');
  const rating = getReviewStatistics(data);
  return <div className="center-remaining center-profile">
    <PageHeader title={tr('centerProfile')} description={tr('profileDescription')}><Button icon={faPen} onClick={() => navigate('/center/settings?section=information')}>{tr('remaining.editInformation')}</Button></PageHeader>
    <Panel className="center-profile__identity">
      <RecordImage src={center.imageUrl} alt={name(center.name)} />
      <div><p className="remaining-eyebrow">{tr('physicalTherapyCenter')}</p><h2>{name(center.name)}</h2>
        {rating.count > 0 && <div className="center-profile__rating"><RatingStars rating={rating.average} showValue /><span>{tr('basedOnReviews', { count: rating.count })}</span></div>}
      </div>
    </Panel>
    <div className="center-profile__layout">
      <div className="center-profile__main">
        <Panel title={tr('aboutUs')}><p className="remaining-prose">{name(center.about) || tr('remaining.notProvided')}</p></Panel>
        <Panel title={tr('gallery')}>
          {gallery.length ? <div className="center-profile__gallery">{gallery.map((src, index) => <button type="button" key={src} onClick={() => setPhoto(index)} aria-label={tr('viewPhoto', { count: index + 1 })}><RecordImage src={src} alt={tr('centerPhoto', { count: index + 1 })} /></button>)}</div> : <EmptyState>{tr('remaining.noPhotos')}</EmptyState>}
        </Panel>
        <Panel title={tr('servicesOffered')} action={<PageLink to="/center/services">{tr('viewAll')}</PageLink>}>
          {services.length ? <div className="center-profile__services">{services.slice(0, 6).map(service => <article key={service.id}>
            <RecordImage src={service.imageUrl} alt={name(service.name)} />
            <div><h3>{name(service.name)}</h3><span>{tr('minutes', { count: service.duration })}</span><strong>{money(service.price, language)}</strong></div>
          </article>)}</div> : <EmptyState>{tr('noResults')}</EmptyState>}
        </Panel>
      </div>
      <aside className="center-profile__aside">
        <Panel title={tr('contact')}><dl className="center-detail-list">
          <div><dt>{tr('phone')}</dt><dd>{center.phone ? <a href={`tel:${center.phone}`}><bdi>{center.phone}</bdi></a> : tr('remaining.notProvided')}</dd></div>
          <div><dt>{tr('email')}</dt><dd>{center.email ? <a href={`mailto:${center.email}`}><bdi>{center.email}</bdi></a> : tr('remaining.notProvided')}</dd></div>
          <div><dt>{tr('remaining.addressLabel')}</dt><dd>{name(center.address) || tr('remaining.notProvided')}</dd></div>
        </dl></Panel>
        <Panel title={tr('workingHours')}>{center.hours ? <dl className="center-profile__hours">{[['saturdayThursday', 'weekStart', 'weekEnd'], ['friday', 'fridayStart', 'fridayEnd']].map(([label, start, end]) => <div key={label}><dt>{tr(label)}</dt><dd><bdi>{center.hours[start]} – {center.hours[end]}</bdi></dd></div>)}</dl> : <p>{tr('remaining.notProvided')}</p>}</Panel>
        <LocationPanel />
      </aside>
    </div>
    {photo !== null && gallery[photo] && <Modal isOpen className="center-modal" size="lg" dir={dir} title={tr('centerPhoto', { count: photo + 1 })} onClose={() => setPhoto(null)} footer={<>
      <Button variant="outline" disabled={photo === 0} onClick={() => setPhoto(value => value - 1)}>{tr('remaining.previousPhoto')}</Button>
      <Button variant="outline" disabled={photo === gallery.length - 1} onClick={() => setPhoto(value => value + 1)}>{tr('remaining.nextPhoto')}</Button>
    </>}><img className="remaining-gallery-preview" src={gallery[photo]} alt={tr('centerPhoto', { count: photo + 1 })} /></Modal>}
  </div>;
}
