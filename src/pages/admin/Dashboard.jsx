import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowUp,
  faArrowRight,
  faArrowLeft,
  faHospital,
  faUsers,
  faUserDoctor,
} from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { Panel } from '../../components/center/CenterUI.jsx';
import './Dashboard.css';

function MetricCard({ icon, label, value, change, chart }) {
  return (
    <div className="admin-metric-card">
      <div className="admin-metric-card__header">
        <div className="admin-metric-card__info">
          <span className="admin-metric-card__label">{label}</span>
          <div className="admin-metric-card__value-row">
            <strong className="admin-metric-card__value">{value}</strong>
            <span className="admin-metric-card__badge">
              <FontAwesomeIcon icon={faArrowUp} />
              {change}
            </span>
          </div>
        </div>
        <span className="admin-metric-card__icon">
          <FontAwesomeIcon icon={icon} />
        </span>
      </div>
      {chart && <div className="admin-metric-card__chart">{chart}</div>}
    </div>
  );
}

function MiniBarChart() {
  return (
    <svg className="admin-mini-chart" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
      <rect x="2" y="15" width="8" height="12" rx="2" />
      <rect x="14" y="10" width="8" height="17" rx="2" />
      <rect x="26" y="12" width="8" height="15" rx="2" />
      <rect x="38" y="8" width="8" height="19" rx="2" />
      <rect x="50" y="12" width="8" height="15" rx="2" />
      <rect x="62" y="6" width="8" height="21" rx="2" />
      <rect x="74" y="10" width="8" height="17" rx="2" />
      <rect x="86" y="14" width="8" height="13" rx="2" />
    </svg>
  );
}

function MiniLineChart() {
  return (
    <svg className="admin-mini-chart" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
      <polyline
        points="2,18 14,12 26,15 38,8 50,12 62,6 74,10 86,14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AdminDashboard() {
  const { t, dir, language } = useLanguage();
  const [year, setYear] = useState('2026');

  // Month abbreviations follow the selected language.
  const monthFormatter = new Intl.DateTimeFormat(language, { month: 'short' });
  const months = Array.from({ length: 11 }, (_, idx) =>
    monthFormatter.format(new Date(2026, idx, 1))
  );

  const notifications = [
    { id: 1, text: t('admin.notification.centerApproval'), unread: true },
    { id: 2, text: t('admin.notification.appointmentCancelled'), unread: true },
    { id: 3, text: t('admin.notification.reviewReported'), unread: true },
    { id: 4, text: t('admin.notification.therapistVerified'), unread: false },
  ];

  const activities = [
    { id: 1, text: t('admin.activity.centerSubmitted'), time: t('admin.dashboard.hoursAgo', { count: 2 }) },
    { id: 2, text: t('admin.activity.therapistVerified'), time: t('admin.dashboard.hoursAgo', { count: 4 }) },
    { id: 3, text: t('admin.activity.appointmentConfirmed'), time: t('admin.dashboard.hoursAgo', { count: 6 }) },
    { id: 4, text: t('admin.activity.systemAlert'), time: t('admin.dashboard.hoursAgo', { count: 8 }) },
  ];

  return (
    <div className="admin-dashboard">
      <header className="admin-dashboard__header">
        <div>
          <h1>{t('admin.dashboard.welcome', { name: 'Maya' })}</h1>
          <p>{t('admin.dashboard.subtitle')}</p>
        </div>
      </header>

      <div className="admin-dashboard__metrics">
        <MetricCard
          icon={faHospital}
          label={t('admin.dashboard.activeCenters')}
          value="128"
          change="+8.2%"
          chart={<MiniBarChart />}
        />
        <MetricCard
          icon={faUsers}
          label={t('admin.dashboard.registeredPatients')}
          value="8,492"
          change="+12.4%"
          chart={<MiniLineChart />}
        />
        <MetricCard
          icon={faUserDoctor}
          label={t('admin.dashboard.physiotherapists')}
          value="346"
          change="+5.1%"
          chart={<MiniBarChart />}
        />
      </div>

      <div className="admin-dashboard__grid">
        <Panel title={t('admin.dashboard.appointmentOverview')} className="admin-panel">
          <div className="admin-panel__header-actions">
            <select value={year} onChange={(e) => setYear(e.target.value)} className="admin-select">
              <option value="2026">2026</option>
              <option value="2025">2025</option>
            </select>
          </div>
          <div className="admin-chart">
            <svg viewBox="0 0 400 200" aria-label="Monthly bookings chart">
              <g stroke="var(--color-border)" strokeWidth="1">
                {[40, 80, 120, 160].map((y) => (
                  <line key={y} x1="40" y1={y} x2="380" y2={y} />
                ))}
              </g>
              <g fill="var(--color-primary)" opacity="0.8">
                {[
                  [60, 120],
                  [90, 90],
                  [120, 100],
                  [150, 70],
                  [180, 110],
                  [210, 60],
                  [240, 95],
                  [270, 80],
                  [300, 105],
                  [330, 75],
                  [360, 85],
                ].map(([x, h], idx) => (
                  <rect key={idx} x={x - 8} y={160 - h} width="16" height={h} rx="4" />
                ))}
              </g>
              <g fill="var(--color-text-secondary)" fontSize="10">
                {months.map((m, idx) => (
                  <text key={m} x={60 + idx * 30} y="190" textAnchor="middle">
                    {m}
                  </text>
                ))}
              </g>
            </svg>
          </div>
        </Panel>

        <Panel title={t('admin.dashboard.platformHealth')} className="admin-panel">
          <div className="admin-health">
            <div className="admin-health__circle">
              <svg viewBox="0 0 42 42">
                <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="var(--color-border)" strokeWidth="3" />
                <circle
                  cx="21"
                  cy="21"
                  r="15.91549430918954"
                  fill="transparent"
                  stroke="var(--color-success)"
                  strokeWidth="3"
                  strokeDasharray="94 6"
                  strokeDashoffset="25"
                  strokeLinecap="round"
                />
              </svg>
              <div className="admin-health__circle-text">
                <strong>94%</strong>
                <span>{t('admin.dashboard.healthy')}</span>
              </div>
            </div>
            <div className="admin-health__metrics">
              <div>
                <span>{t('admin.dashboard.approvalResponse')}</span>
                <strong>{t('admin.dashboard.hours', { count: '2.4' })}</strong>
              </div>
              <div>
                <span>{t('admin.dashboard.satisfaction')}</span>
                <strong>4.8 / 5.0</strong>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <div className="admin-dashboard__grid admin-dashboard__grid--bottom">
        <Panel title={t('admin.dashboard.notifications')} className="admin-panel">
          <ul className="admin-notifications">
            {notifications.map((n) => (
              <li key={n.id} className="admin-notifications__item">
                <span className={`admin-notifications__dot ${n.unread ? 'admin-notifications__dot--unread' : ''}`} />
                <span className="admin-notifications__text">{n.text}</span>
              </li>
            ))}
          </ul>
          <Link to="/admin/notifications" className="admin-panel__link">
            {t('admin.dashboard.viewAllNotifications')}
            <FontAwesomeIcon icon={dir === 'rtl' ? faArrowLeft : faArrowRight} />
          </Link>
        </Panel>

        <Panel title={t('admin.dashboard.pendingApprovals')} className="admin-panel">
          <div className="admin-approvals">
            <div className="admin-approvals__count">
              <strong>17</strong>
              <span>{t('admin.dashboard.itemsNeedAttention', { count: 17 })}</span>
            </div>
            <div className="admin-approvals__breakdown">
              <div>
                <span>{t('admin.dashboard.centers')}</span>
                <strong>7</strong>
              </div>
              <div>
                <span>{t('admin.dashboard.therapists')}</span>
                <strong>6</strong>
              </div>
              <div>
                <span>{t('admin.dashboard.reportedReviews')}</span>
                <strong>4</strong>
              </div>
            </div>
            <div className="admin-approvals__actions">
              <Link to="/admin/centers">{t('admin.dashboard.reviewCenters')}</Link>
              <Link to="/admin/physiotherapists">{t('admin.dashboard.reviewTherapists')}</Link>
              <Link to="/admin/reviews">{t('admin.dashboard.reviewReports')}</Link>
            </div>
          </div>
        </Panel>

        <Panel title="Recent Activity Feed" className="admin-panel admin-panel--wide">
          <ul className="admin-activity">
            {activities.map((a) => (
              <li key={a.id} className="admin-activity__item">
                <div>
                  <span className="admin-activity__text">{a.text}</span>
                  <span className="admin-activity__time">{a.time}</span>
                </div>
              </li>
            ))}
          </ul>
          <button className="admin-panel__link-button">{t('center.viewAll')}</button>
        </Panel>
      </div>
    </div>
  );
}

export default AdminDashboard;
