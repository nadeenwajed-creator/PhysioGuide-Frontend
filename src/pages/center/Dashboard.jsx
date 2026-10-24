import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarDays,
  faUsers,
  faClock,
  faStar,
  faUserPlus,
  faUserDoctor,
  faPlus,
  faArrowRight,
  faArrowLeft,
} from '@fortawesome/free-solid-svg-icons';
import Button from '../../components/shared/Button/Button.jsx';
import Avatar from '../../components/shared/Avatar/Avatar.jsx';
import { Panel, RecordStatus, EmptyState } from '../../components/center/CenterUI.jsx';
import RecordForm from '../../components/center/RecordForm.jsx';
import AppointmentDetails from '../../components/center/AppointmentDetails.jsx';
import useCenter from '../../components/center/useCenter.js';
import { getDashboardSummary } from '../../services/centerSummaryService.js';
import { formatDate } from '../../utils/centerFormat.js';
import hero from '../../assets/images/center/dashboard-treatment-room.jpeg';
import './Dashboard.css';
function Dashboard() {
  const navigate = useNavigate();
  const { data, name, tr, language, dir } = useCenter();
  const [form, setForm] = useState(null);
  const [selected, setSelected] = useState(null);
  const summary = getDashboardSummary(data);
  const number = new Intl.NumberFormat(language, {
    maximumFractionDigits: 1,
  });
  const stats = [
    {
      label: 'todayAppointments',
      value: summary.todayAppointments.length,
      icon: faCalendarDays,
    },
    {
      label: 'totalPatients',
      value: summary.patientCount,
      icon: faUsers,
    },
    {
      label: 'upcomingAppointments',
      value: summary.upcoming.length,
      icon: faClock,
    },
    {
      label: 'averageRating',
      value: summary.averageRating,
      icon: faStar,
    },
  ];
  const dates = [...new Set(summary.upcoming.map((item) => item.date))].slice(0, 2);
  return (
    <div className="center-dashboard">
      {/* One greeting, using the current workspace identity. */}
      <section className="center-dashboard__hero" aria-labelledby="center-welcome">
        <div className="center-dashboard__hero-copy">
          <h1 id="center-welcome">{tr('welcome', { name: name(data.center.name) })}</h1>
          <p>{tr('dashboardDescription')}</p>
          <Button onClick={() => navigate('/center/appointments')}>
            {tr('viewAppointments')}
            <FontAwesomeIcon
              icon={dir === 'rtl' ? faArrowLeft : faArrowRight}
              aria-hidden="true"
            />
          </Button>
        </div>
        <div className="center-dashboard__hero-media">
          <img src={hero} alt={tr('heroAlt')} />
        </div>
      </section>
      <div className="center-dashboard__stats">
        {stats.map((stat) => (
          <div className="center-dashboard__stat" key={stat.label}>
            <span className="center-dashboard__stat-icon">
              <FontAwesomeIcon icon={stat.icon} />
            </span>
            <div>
              <span>{tr(stat.label)}</span>
              <strong>{number.format(stat.value)}</strong>
            </div>
          </div>
        ))}
      </div>
      {/* Today's schedule and quick actions. */}
      <div className="center-dashboard__lower">
        <Panel title={tr('todaySchedule')}>
          {summary.todayAppointments.length ? (
            <ul className="center-dashboard__schedule">
              {summary.todayAppointments.slice(0, 3).map((appointment) => {
                const patient = data.patients.find(
                  (item) => item.id === appointment.patientId,
                );
                const service = data.services.find(
                  (item) => item.id === appointment.serviceId,
                );
                const therapist = data.therapists.find(
                  (item) => item.id === appointment.therapistId,
                );
                return (
                  <li key={appointment.id}>
                    <time>{appointment.time}</time>
                    <Avatar
                      src={patient?.imageUrl}
                      name={name(patient?.name)}
                      size="sm"
                    />
                    <div className="center-dashboard__patient">
                      <strong>{name(patient?.name)}</strong>
                      <span>{name(service?.name)}</span>
                      <small>{name(therapist?.name)}</small>
                    </div>
                    <RecordStatus value={appointment.status} />
                    <Button
                      variant="ghost"
                      iconOnly
                      icon={dir === 'rtl' ? faArrowLeft : faArrowRight}
                      aria-label={tr('viewAppointmentFor', {
                        name: name(patient?.name),
                      })}
                      onClick={() => setSelected(appointment)}
                    />
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState>{tr('noAppointments')}</EmptyState>
          )}
          {summary.todayAppointments.length > 3 && (
            <p className="center-dashboard__more">
              {tr('moreAppointments', {
                count: summary.todayAppointments.length - 3,
              })}
            </p>
          )}
        </Panel>
        <div className="center-dashboard__side">
          <Panel title={tr('quickActions')}>
            <div className="center-dashboard__quick">
              {[
                ['appointment', faCalendarDays],
                ['patient', faUserPlus],
                ['therapist', faUserDoctor],
                ['service', faPlus],
              ].map(([kind, icon]) => (
                <Button
                  key={kind}
                  variant="ghost"
                  icon={icon}
                  onClick={() =>
                    setForm({
                      kind,
                    })
                  }
                >
                  {tr(`add.${kind}`)}
                </Button>
              ))}
            </div>
          </Panel>
          <Panel title={tr('upcomingAppointments')}>
            {dates.length ? (
              dates.map((date) => (
                <div className="center-dashboard__upcoming" key={date}>
                  <div>
                    <strong>{formatDate(date, language)}</strong>
                    <small>
                      {tr('appointmentCount', {
                        count: summary.upcoming.filter((item) => item.date === date)
                          .length,
                      })}
                    </small>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState>{tr('noAppointments')}</EmptyState>
            )}
          </Panel>
        </div>
      </div>
      {form && (
        <RecordForm kind={form.kind} record={form.record} onClose={() => setForm(null)} />
      )}
      {selected && (
        <AppointmentDetails
          appointment={selected}
          onClose={() => setSelected(null)}
          onEdit={() => {
            setForm({
              kind: 'appointment',
              record: selected,
            });
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}
export default Dashboard;
