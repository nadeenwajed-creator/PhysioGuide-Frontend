import { usePatientLabels } from '../../components/patient/usePatientLabels.js';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronRight, faSliders, faRotateLeft } from '@fortawesome/free-solid-svg-icons';
import SearchBar from '../../components/shared/SearchBar/SearchBar.jsx';
import FilterSelect from '../../components/shared/FilterSelect/FilterSelect.jsx';
import Button from '../../components/shared/Button/Button.jsx';
import { PageHeader, Pager } from '../../components/center/CenterUI.jsx';
import usePagination from '../../components/center/usePagination.js';
import useDiscovery from '../../components/patient/useDiscovery.js';
import { DiscoveryState, CenterCard } from '../../components/patient/DiscoveryUI.jsx';
import BookingModal from '../../components/patient/BookingModal.jsx';
import {
  careCategories,
  filterCenters,
  normalizeSpecialty
} from '../../services/patient/specialtyMatching.js';
import { useLanguage } from '../../context/LanguageContext.jsx';
import '../../components/patient/PatientDiscovery.css';

export default function FindCenters() {
  const state = useDiscovery();
  const { t: translate } = useLanguage();
  const [params, setParams] = useSearchParams();
  const { t, name, language } = usePatientLabels();
  // Read filters from the URL so opening the same link restores the search
  const q = params.get('q') || '',
    specialty = params.get('specialty') || '',
    rating = params.get('rating') || '',
    price = params.get('price') || '';
  const sort = ['rating', 'price', 'name'].includes(params.get('sort')) ? params.get('sort') : 'rating';
  const saved = params.get('saved') === 'true';
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [booking, setBooking] = useState(null);
  const centers = state.data?.centers || [];
  // Combine service and therapist specialties without repeating matching names
  const specialties = [...new Map(centers.flatMap(c => [...c.services.map(s => s.name), ...c.therapists.map(p => p.specialty)]).filter(Boolean)
    .map(value => [normalizeSpecialty(typeof value === 'string' ? value : value.en || value.ar), value])).values()];
  // Filter and sort the full list before taking the current page
  const results = filterCenters(centers, {
    search: q,
    specialty,
    rating,
    price,
    sort,
    savedOnly: saved,
    favoriteIds: state.data?.favoriteIds || [],
    language
  });
  const pg = usePagination(results.length);
  function update(key, value) {
    // Change one filter while keeping the other choices in the URL
    setParams(current => {
      const next = new URLSearchParams(current);
      value ? next.set(key, String(value)) : next.delete(key);
      return next;
      }, {
        replace: true
    });
    // A new filter can have fewer results, so return to the first page
    pg.setPage(1);
  }
  return <div className="pd-page">
    <nav className="pd-breadcrumb" aria-label={t('centers')}>
      <Link to="/patient/dashboard">
        {t('dashboard')}
      </Link>
      <FontAwesomeIcon className="pd-chevron" icon={faChevronRight} />
      <span aria-current="page">{t('centers')}</span>
    </nav>
    <PageHeader title={t('findTitle')} description={t('findText')} />
    <div className={`pd-filters ${filtersOpen ? 'is-open' : ''}`}>
      <SearchBar
        value={q}
        onChange={v => update('q', v)}
        ariaLabel={t('search')}
        placeholder={t('search')}
      />
      <Button
        className="pd-filter-toggle"
        variant="outline"
        icon={faSliders}
        aria-expanded={filtersOpen}
        aria-controls="patient-discovery-filters"
        onClick={() => setFiltersOpen(value => !value)}
      >
        {t('filters')}
      </Button>
      <div className="pd-filter-controls" id="patient-discovery-filters">
        <FilterSelect
          ariaLabel={t('specialty')}
          value={specialty}
          onChange={v => update('specialty', v)}
          options={[
            {
              value: '',
              label: t('specialty')
            },
            ...Object.keys(careCategories).map(key => ({
              value: `care:${key}`,
              label: translate(`painAssessment.care.${key}`)
            })),
            ...specialties.map(s => ({
              value: typeof s === 'string' ? s : s.en || s.ar,
              label: name(s)
            }))
          ]}
        />
        <FilterSelect
          ariaLabel={t('rating')}
          value={rating}
          onChange={v => update('rating', v)}
          options={[{
            value: '',
            label: t('rating')
            }, ...['3', '4', '4.5'].map(v => ({
              value: v,
              label: v + '+'
          }))]}
        />
        <FilterSelect
          ariaLabel={t('price')}
          value={price}
          onChange={v => update('price', v)}
          options={[{
            value: '',
            label: t('price')
            }, ...['50', '100', '200'].map(v => ({
              value: v,
              label: '≤ ₪' + v
          }))]}
        />
        <FilterSelect
          ariaLabel={t('sort')}
          value={sort}
          onChange={v => update('sort', v)}
          options={['rating', 'price', 'name'].map(v => ({
            value: v,
            label: t(v + 'Sort')
          }))}
        />
        <Button
          variant="ghost"
          iconOnly
          icon={faRotateLeft}
          aria-label={t('resetFilters')}
          onClick={() => {
            // Reset the filters while keeping the saved-centers view if selected
            setParams(saved ? {
              saved: 'true'
            } : {});
            pg.setPage(1);
          }}
        />
      </div>
    </div>
    <div className="pd-tabs">
      <Button
        variant={!saved ? 'primary' : 'outline'}
        aria-pressed={!saved}
        onClick={() => update('saved', '')}
    >{t('all')} <span className="pd-count">{centers.length}</span></Button>
      <Button
        variant={saved ? 'primary' : 'outline'}
        aria-pressed={saved}
        onClick={() => update('saved', 'true')}
    >{t('saved')} <span className="pd-count">{state.data?.favoriteIds.length || 0}</span></Button>
      <span>
        {t('results', {
          count: results.length
        })}
      </span>
    </div>
    <DiscoveryState state={state}>
      <div className="pd-grid">
        {results.slice(pg.start, pg.start + pg.pageSize).map(c => <CenterCard key={c.id} center={c} state={state} onBook={setBooking} />)}
      </div>
      {!results.length && <p role="status">{t('empty')}</p>}
      <Pager
        page={pg.page}
        total={results.length}
        onChange={pg.setPage}
        pageSize={pg.pageSize}
        onPageSizeChange={pg.setPageSize}
      />
      {booking && <BookingModal state={state} initial={booking} onClose={() => setBooking(null)} />}
    </DiscoveryState>
  </div>;
}
