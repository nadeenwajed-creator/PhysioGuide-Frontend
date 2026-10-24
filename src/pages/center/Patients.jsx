import { useState } from 'react';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import Button from '../../components/shared/Button/Button.jsx';
import SearchBar from '../../components/shared/SearchBar/SearchBar.jsx';
import FilterSelect from '../../components/shared/FilterSelect/FilterSelect.jsx';
import Avatar from '../../components/shared/Avatar/Avatar.jsx';
import {
  PageHeader,
  Panel,
  Pager,
  RecordStatus,
  EmptyState,
} from '../../components/center/CenterUI.jsx';
import RecordForm from '../../components/center/RecordForm.jsx';
import PatientDetails from '../../components/center/PatientDetails.jsx';
import useCenter from '../../components/center/useCenter.js';
import usePagination from '../../components/center/usePagination.js';
import { includesQuery, formatDate } from '../../utils/centerFormat.js';
import './Patients.css';
function Patients() {
  const { data, tr, name, language } = useCenter();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [relationship, setRelationship] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(null);
  const matches = data.patients.filter(
    (item) =>
      includesQuery(query, name(item.name), item.phone, item.email) &&
      (status === 'all' || item.status === status) &&
      (relationship === 'all' ||
        data.appointments.some((appointment) => appointment.patientId === item.id)),
  );
  const {
    page: currentPage,
    setPage,
    pageSize,
    setPageSize,
    start,
  } = usePagination(matches.length);
  const selected = data.patients.find((item) => item.id === selectedId);
  function filter(setter, value) {
    setter(value);
    setPage(1);
  }
  return (
    <div className="center-patients">
      {/* Heading and primary page action. */}
      <PageHeader title={tr('patients')} description={tr('patientsDescription')}>
        <Button icon={faPlus} onClick={() => setForm({})}>
          {tr('add.patient')}
        </Button>
      </PageHeader>
      <Panel className="center-records">
        <div className="center-filter-bar">
          <SearchBar
            value={query}
            onChange={(value) => filter(setQuery, value)}
            placeholder={tr('searchPatients')}
            ariaLabel={tr('searchPatients')}
          />
          <FilterSelect
            value={relationship}
            onChange={(value) => filter(setRelationship, value)}
            ariaLabel={tr('patientType')}
            options={[
              {
                value: 'all',
                label: tr('allPatients'),
              },
              {
                value: 'appointments',
                label: tr('withAppointments'),
              },
            ]}
          />
          <FilterSelect
            value={status}
            onChange={(value) => filter(setStatus, value)}
            ariaLabel={tr('status')}
            options={['all', 'active', 'inactive'].map((value) => ({
              value,
              label: tr(value),
            }))}
          />
        </div>
        {matches.length ? (
          <table className="center-table center-table--patients">
            <thead>
              <tr>
                {['patientId', 'contact', 'lastAppointment', 'status', 'actions'].map(
                  (key) => (
                    <th key={key} scope="col">
                      {tr(key)}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {matches.slice(start, start + pageSize).map((patient) => {
                const last = data.appointments
                  .filter(
                    (item) =>
                      item.patientId === patient.id &&
                      item.date <= data.today &&
                      item.status !== 'cancelled',
                  )
                  .sort((a, b) =>
                    `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`),
                  )[0];
                return (
                  <tr key={patient.id}>
                    <td className="center-table__identity" data-label={tr('patientId')}>
                      <div className="center-identity">
                        <Avatar
                          src={patient.imageUrl}
                          name={name(patient.name)}
                          size="sm"
                        />
                        <button
                          className="center-name-button"
                          onClick={() => setSelectedId(patient.id)}
                        >
                          {name(patient.name)}
                        </button>
                      </div>
                    </td>
                    <td className="center-table__contact" data-label={tr('contact')}>
                      <div className="center-contact">
                        <bdi>{patient.email}</bdi>
                        <small>
                          <bdi>{patient.phone}</bdi>
                        </small>
                      </div>
                    </td>
                    <td data-label={tr('lastAppointment')}>
                      {formatDate(last?.date, language)}
                    </td>
                    <td className="center-table__status" data-label={tr('status')}>
                      <div>
                        <RecordStatus value={patient.status} />
                      </div>
                    </td>
                    <td className="center-table__actions" data-label={tr('actions')}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedId(patient.id)}
                      >
                        {tr('view')}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <EmptyState>{tr('noResults')}</EmptyState>
        )}
        <Pager
          page={currentPage}
          total={matches.length}
          onChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
        />
      </Panel>
      {selected && (
        <PatientDetails
          patient={selected}
          onClose={() => setSelectedId(null)}
          onEdit={() => {
            setForm(selected);
            setSelectedId(null);
          }}
        />
      )}
      {form && (
        <RecordForm
          kind="patient"
          record={form.id ? form : undefined}
          onClose={() => setForm(null)}
        />
      )}
    </div>
  );
}
export default Patients;
