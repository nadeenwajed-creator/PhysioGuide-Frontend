import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import Button from '../../components/shared/Button/Button.jsx';
import Modal from '../../components/shared/Modal/Modal.jsx';
import StatusBadge from '../../components/shared/StatusBadge/StatusBadge.jsx';
import { PageHeader, RecordImage, RecordStatus } from '../../components/center/CenterUI.jsx';
import usePatientAccount from '../../components/patient/usePatientAccount.js';
import { AccountState, AccountTabs } from '../../components/patient/AccountUI.jsx';
import { appointmentTabs, appointmentCounts, appointmentGroup } from '../../services/patient/accountModel.js';
import '../../components/patient/PatientAccount.css';

export default function Appointments() {
  const state = usePatientAccount();
  const { tr, common, name, language, dir, data } = state;
  const [params, setParams] = useSearchParams();
  // Use the tab from the link only when it is one of the supported tabs
  const selected = appointmentTabs.includes(params.get('tab')) ? params.get('tab') : 'upcoming';
  const [detailKey, setDetailKey] = useState(null);
  const rows = data?.appointments || [],
    counts = appointmentCounts(rows);
  // Include the center in the clicked key because appointment IDs can repeat
  // The URL can also open an appointment directly
  const detail = rows.find(row => `${row.centerId}:${row.id}` === detailKey || !detailKey && row.id === params.get('appointment'));
  function closeDetails() {
    setDetailKey(null);
    setParams(current => {
      const next = new URLSearchParams(current);
      // Remove the direct link too so closing does not reopen the same details
      next.delete('appointment');
      return next;
      }, {
        replace: true
    });
  }
  // Show the nearest upcoming visit first, and the newest past visit first
  const visible = rows.filter(row => appointmentGroup(row) === selected)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`) * (selected === 'upcoming' ? 1 : -1));
  // Parse at local noon to keep the appointment's calendar date
  const format = (date, options) => new Intl.DateTimeFormat(language, options).format(new Date(`${date}T12:00:00`));
  return <div className="pa-page">
    <PageHeader title={tr('appointments')} description={tr('appointmentsIntro')} />
    <AccountState state={state}>
      <AccountTabs
        id="appointments"
        tabs={appointmentTabs.map(key => ({
          key,
          count: counts[key]
        }))}
        selected={selected}
        onChange={key => setParams({
          tab: key
        })}
        tr={tr}
        dir={dir}
      />
      <div
        id="appointments-panel"
        role="tabpanel"
        aria-labelledby={`appointments-${selected}`}
        className="pa-appointments"
      >
        {!visible.length && <p role="status" className="pa-empty">{tr('emptyAppointments')}</p>}
        {visible.map(row => <article className="pa-appointment" key={`${row.centerId}:${row.id}`}>
          <div className="pa-date-status">
            <StatusBadge status={row.status} />
            <time className="pa-date" dateTime={`${row.date}T${row.time}`}>
              <span>
                {format(row.date, {
                  weekday: 'short'
                })}
              </span>
              <strong>
                {format(row.date, {
                  day: '2-digit'
                })}
              </strong>
              <span>
                {format(row.date, {
                  month: 'short'
                })}
              </span>
              <bdi>{row.time}</bdi>
            </time>
          </div>
          {row.therapistAvailable ? <Link
            className="pa-therapist-photo"
            to={`/patient/centers/${encodeURIComponent(row.centerId)}/therapists/${encodeURIComponent(row.therapistId)}`}
            aria-label={name(row.therapistName)}
          >
            <RecordImage src={row.therapistImage} alt="" />
          </Link> : <RecordImage
            className="pa-therapist-photo"
            src={row.therapistImage}
            alt={name(row.therapistName)}
          />}
          <div className="pa-appointment__text">
            <h2>{name(row.serviceName) || tr('notProvided')}</h2>
            <p>{name(row.therapistName) || tr('notProvided')}</p>
          </div>
          <div className="pa-appointment__actions">
            <Button
              className="pa-appointment-detail"
              variant="outline"
              icon={dir === 'rtl' ? faChevronLeft : faChevronRight}
              aria-label={`${tr('viewDetails')}: ${name(row.serviceName)} ${row.date} ${row.time}`}
              onClick={() => setDetailKey(`${row.centerId}:${row.id}`)}
            >
              <span className="pa-detail-label">{tr('viewDetails')}</span>
            </Button>
          </div>
        </article>)}
      </div>
    </AccountState>
    {detail && <Modal
      isOpen
      title={common('appointmentDetails')}
      onClose={closeDetails}
      dir={dir}
      footer={<Button variant="outline" onClick={closeDetails}>{common('close')}</Button>}
    >
      <dl className="center-detail-list">
        {[
          ['service', name(detail.serviceName)],
          ['therapist', name(detail.therapistName)],
          ['center', name(detail.centerName)],
          ['date', format(detail.date, {
            dateStyle: 'long'
          })],
          ['time', detail.time],
          ['duration', detail.duration ? tr('minutes', {
            count: detail.duration
          }) : tr('notProvided')]
        ].map(([key, value]) => <div key={key}>
          <dt>
            {tr(key)}
          </dt>
          <dd>
            {value || tr('notProvided')}
          </dd>
        </div>)}
        <div>
          <dt>
            {common('status')}
          </dt>
          <dd>
            <RecordStatus value={detail.status} />
          </dd>
        </div>
      </dl>
    </Modal>}
  </div>;
}
