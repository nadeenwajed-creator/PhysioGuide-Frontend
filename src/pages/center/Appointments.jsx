import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import Button from '../../components/shared/Button/Button.jsx';
import {
  PageHeader,
  Panel,
  Pager,
  ConfirmDialog,
} from '../../components/center/CenterUI.jsx';
import AppointmentsTable from '../../components/center/AppointmentsTable.jsx';
import AppointmentFilters from '../../components/center/AppointmentFilters.jsx';
import RecordForm from '../../components/center/RecordForm.jsx';
import useCenter from '../../components/center/useCenter.js';
import usePagination from '../../components/center/usePagination.js';
import { includesQuery } from '../../utils/centerFormat.js';
import { updateAppointmentStatus } from '../../services/appointmentService.js';
import { appointmentStatuses } from '../../services/center/appointmentRules.js';
import './Appointments.css';

function Appointments() {
  const { data, actor, name, tr, notify } = useCenter();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ therapist: '', service: '', sort: 'asc' });
  const [status, setStatus] = useState('all');
  const [month, setMonth] = useState(
    params.get('date')?.slice(0, 7) ||
      (params.get('period') === 'upcoming' ? '' : data.today.slice(0, 7)),
  );
  const [form, setForm] = useState(null);
  const [change, setChange] = useState(null);
  const filtered = data.appointments.filter((item) => {
    const patient = data.patients.find((record) => record.id === item.patientId);
    return (
      includesQuery(query, name(patient?.name), patient?.phone) &&
      (!filters.therapist || item.therapistId === filters.therapist) &&
      (!filters.service || item.serviceId === filters.service) &&
      (!month || item.date.startsWith(month)) &&
      (!params.get('date') || item.date === params.get('date')) &&
      (params.get('period') !== 'upcoming' ||
        (item.date > data.today && ['pending', 'confirmed'].includes(item.status)))
    );
  });
  const statuses = appointmentStatuses.map((value) => ({
    value,
    label: `${tr(value)} (${filtered.filter((item) => value === 'all' || item.status === value).length})`,
  }));
  const matches = filtered
    .filter((item) => status === 'all' || item.status === status)
    .sort(
      (a, b) =>
        `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`) *
        (filters.sort === 'asc' ? 1 : -1),
    );
  const {
    page: currentPage,
    setPage,
    pageSize,
    setPageSize,
    start,
  } = usePagination(matches.length);
  function filter(setter, value) {
    setter(value);
    setPage(1);
  }

  return (
    <div className="center-appointments">
      {/* Heading and primary page action. */}
      <PageHeader title={tr('appointments')} description={tr('appointmentsDescription')}>
        <Button icon={faPlus} onClick={() => setForm({})}>
          {tr('add.appointment')}
        </Button>
      </PageHeader>
      <Panel className="center-records">
        <AppointmentFilters
          query={query}
          onQuery={(value) => filter(setQuery, value)}
          month={month}
          onMonth={(value) => {
            filter(setMonth, value);
            setParams({});
          }}
          values={filters}
          onChange={(value) => filter(setFilters, value)}
          status={status}
          onStatus={(value) => filter(setStatus, value)}
          statuses={statuses}
        />
        {(params.get('date') || params.get('period')) && (
          <Button
            variant="ghost"
            onClick={() => {
              setParams({});
              setMonth('');
              setPage(1);
            }}
          >
            {tr('clearDateFilter')}
          </Button>
        )}
        <AppointmentsTable
          appointments={matches.slice(start, start + pageSize)}
          onEdit={setForm}
          onStatus={(appointment, nextStatus) => setChange({ appointment, nextStatus })}
        />
        <Pager
          page={currentPage}
          total={matches.length}
          onChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
        />
      </Panel>
      {form && (
        <RecordForm
          kind="appointment"
          record={form.id ? form : undefined}
          onClose={() => setForm(null)}
        />
      )}
      {change && (
        <ConfirmDialog
          title={tr('changeAppointmentStatus')}
          description={tr('statusChangeHelp', { status: tr(change.nextStatus) })}
          danger={change.nextStatus === 'cancelled'}
          onClose={() => setChange(null)}
          onConfirm={async () => {
            await updateAppointmentStatus(
              actor,
              change.appointment.id,
              change.nextStatus,
            );
            notify(tr('saved'));
          }}
        />
      )}
    </div>
  );
}
export default Appointments;
