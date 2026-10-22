import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faBriefcase, faLayerGroup, faTag } from '@fortawesome/free-solid-svg-icons';
import Button from '../../components/shared/Button/Button.jsx';
import SearchBar from '../../components/shared/SearchBar/SearchBar.jsx';
import FilterSelect from '../../components/shared/FilterSelect/FilterSelect.jsx';
import Avatar from '../../components/shared/Avatar/Avatar.jsx';
import ActionsMenu from '../../components/shared/ActionsMenu/ActionsMenu.jsx';
import RatingStars from '../../components/shared/RatingStars/RatingStars.jsx';
import { PageHeader, Pager, RecordStatus, EmptyState } from '../../components/center/CenterUI.jsx';
import RecordForm from '../../components/center/RecordForm.jsx';
import usePagination from '../../components/center/usePagination.js';
import useCenter from '../../components/center/useCenter.js';
import { includesQuery, money } from '../../utils/centerFormat.js';
import '../../components/center/remaining/RemainingUI.css';
import './Physiotherapists.css';
function Physiotherapists() {
  const {
    data,
    tr,
    name,
    language
  } = useCenter();
  const [query, setQuery] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [availability, setAvailability] = useState('all');
  const [sort, setSort] = useState('rating');
  const [form, setForm] = useState(null);
  // Stable values keep an active specialty filter valid after switching language.
  const specialties = [...new Map(data.therapists.map(item => [item.specialty.en, item.specialty])).values()];
  const matches = data.therapists.filter(item => includesQuery(query, name(item.name), name(item.specialty), item.email, item.phone) && (!specialty || item.specialty.en === specialty) && (availability === 'all' || item.availability === availability)).sort((a, b) => sort === 'name' ? name(a.name).localeCompare(name(b.name), language) : sort === 'price' ? a.price - b.price : b.rating - a.rating);
  const { page: currentPage, setPage, pageSize, setPageSize, start } = usePagination(matches.length);
  function filter(setter, value) {
    setter(value);
    setPage(1);
  }
  return <div className="center-remaining center-physiotherapists">
    <PageHeader title={tr('physiotherapists')} description={tr('therapistsDescription')}><Button icon={faPlus} onClick={() => setForm({})}>{tr('add.therapist')}</Button></PageHeader>
    <div className="center-filter-bar center-physiotherapists__filters">
      <SearchBar value={query} onChange={value => filter(setQuery, value)} placeholder={tr('searchTherapists')} ariaLabel={tr('searchTherapists')} />
      <FilterSelect value={specialty} onChange={value => filter(setSpecialty, value)} ariaLabel={tr('specialty')} options={[{
        value: '',
        label: tr('allSpecialties')
      }, ...specialties.map(value => ({
        value: value.en,
        label: name(value)
      }))]} />
      <FilterSelect value={availability} onChange={value => filter(setAvailability, value)} ariaLabel={tr('availability')} options={['all', 'available', 'unavailable'].map(value => ({
        value,
        label: tr(value)
      }))} />
      <FilterSelect value={sort} onChange={value => filter(setSort, value)} ariaLabel={tr('sort')} options={['rating', 'name', 'price'].map(value => ({
        value,
        label: tr(`sort.${value}`)
      }))} />
    </div>
    <div className="center-physiotherapists__grid">{matches.slice(start, start + pageSize).map(therapist => <article className="center-panel center-physiotherapists__card" key={therapist.id}>
        <div className="center-physiotherapists__card-head">
          <Avatar src={therapist.imageUrl} name={name(therapist.name)} size="md" />
          <div>
            <h2>{name(therapist.name)}</h2>
            <RatingStars rating={therapist.rating} showValue />
            <p>{name(therapist.specialty)}</p>
          </div>
          <ActionsMenu items={[{
            label: tr('edit.therapist'),
            onClick: () => setForm(therapist)
          }]} />
        </div>
        <dl>
          <div>
            <dt>
              <FontAwesomeIcon icon={faBriefcase} />
              <span>{tr('experience')}</span>
            </dt>
            <dd>{tr('years', {
                count: therapist.experience
              })}</dd>
          </div>
          <div>
            <dt>
              <FontAwesomeIcon icon={faLayerGroup} />
              <span>{tr('sessions')}</span>
            </dt>
            <dd>{new Intl.NumberFormat(language).format(therapist.completedSessions)}</dd>
          </div>
          <div>
            <dt>
              <FontAwesomeIcon icon={faTag} />
              <span>{tr('price')}</span>
            </dt>
            <dd>{money(therapist.price, language)}</dd>
          </div>
        </dl>
        <div className="center-physiotherapists__contact"><a href={`mailto:${therapist.email}`}><bdi>{therapist.email}</bdi></a><a href={`tel:${therapist.phone}`}><bdi>{therapist.phone}</bdi></a></div>
        <RecordStatus value={therapist.availability} />
      </article>)}</div>
    {!matches.length && <EmptyState>{tr('noResults')}</EmptyState>}
    <Pager page={currentPage} total={matches.length} onChange={setPage} pageSize={pageSize} onPageSizeChange={setPageSize} />
    {form && <RecordForm kind="therapist" record={form.id ? form : undefined} onClose={() => setForm(null)} />}
  </div>;
}
export default Physiotherapists;
