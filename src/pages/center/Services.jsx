import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faPen, faTrash, faClock } from '@fortawesome/free-solid-svg-icons';
import Button from '../../components/shared/Button/Button.jsx';
import SearchBar from '../../components/shared/SearchBar/SearchBar.jsx';
import FilterSelect from '../../components/shared/FilterSelect/FilterSelect.jsx';
import { PageHeader, Pager, RecordImage, EmptyState, ConfirmDialog } from '../../components/center/CenterUI.jsx';
import RecordForm from '../../components/center/RecordForm.jsx';
import usePagination from '../../components/center/usePagination.js';
import useCenter from '../../components/center/useCenter.js';
import { includesQuery, money } from '../../utils/centerFormat.js';
import { deleteCenterService } from '../../services/serviceService.js';
import '../../components/center/remaining/RemainingUI.css';
import './Services.css';
function Services() {
  const {
    data,
    actor,
    tr,
    name,
    language,
    notify
  } = useCenter();
  const [query, setQuery] = useState('');
  const [duration, setDuration] = useState('all');
  const [form, setForm] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const matches = data.services.filter(item => includesQuery(query, name(item.name), name(item.description)) && (duration === 'all' || String(item.duration) === duration));
  const { page: currentPage, setPage, pageSize, setPageSize, start } = usePagination(matches.length);
  function filter(setter, value) {
    setter(value);
    setPage(1);
  }
  return <div className="center-remaining center-services">
    <PageHeader title={tr('services')} description={tr('servicesDescription')}><Button icon={faPlus} onClick={() => setForm({})}>{tr('add.service')}</Button></PageHeader>
    <div className="center-filter-bar center-services__filters">
      <SearchBar value={query} onChange={value => filter(setQuery, value)} placeholder={tr('searchServices')} ariaLabel={tr('searchServices')} />
      <FilterSelect value={duration} onChange={value => filter(setDuration, value)} ariaLabel={tr('duration')} options={[{
        value: 'all',
        label: tr('allServices')
      }, ...[...new Set(data.services.map(item => item.duration))].sort((a, b) => a - b).map(value => ({
        value: String(value),
        label: tr('minutes', {
          count: value
        })
      }))]} />
    </div>
    <div className="center-services__grid">{matches.slice(start, start + pageSize).map(service => <article className="center-panel center-services__card" key={service.id}>
        <RecordImage src={service.imageUrl} alt={name(service.name)} />
        <h2>{name(service.name)}</h2>
        <div className="center-services__meta">
          <strong>{money(service.price, language)}</strong>
          <span>
            <FontAwesomeIcon icon={faClock} />
            {tr('minutes', {
              count: service.duration
            })}
          </span>
        </div>
        <p>{name(service.description)}</p>
        <div className="center-services__actions">
          <Button variant="outline" icon={faPen} onClick={() => setForm(service)}>{tr('edit')}</Button>
          <Button variant="danger" icon={faTrash} iconOnly aria-label={tr('deleteNamed', {
            name: name(service.name)
          })} onClick={() => setDeleting(service)} />
        </div>
      </article>)}</div>
    {!matches.length && <EmptyState>{tr('noResults')}</EmptyState>}
    <Pager page={currentPage} total={matches.length} onChange={setPage} pageSize={pageSize} onPageSizeChange={setPageSize} />
    {form && <RecordForm kind="service" record={form.id ? form : undefined} onClose={() => setForm(null)} />}
    {deleting && <ConfirmDialog title={tr('deleteService')} description={tr('deleteServiceHelp', {
      name: name(deleting.name)
    })} danger onClose={() => setDeleting(null)} onConfirm={async () => {
      await deleteCenterService(actor, deleting.id);
      notify(tr('deleted'));
    }} />}
  </div>;
}
export default Services;
