import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowUp,
  faArrowDown,
  faArrowRight,
  faArrowLeft,
  faHospital,
  faUsers,
  faUserDoctor,
} from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import FilterSelect from '../../components/shared/FilterSelect/FilterSelect.jsx';
import { Panel } from '../../components/center/CenterUI.jsx';
import { localized, formatDate } from '../../utils/centerFormat.js';
import useAdminQuery from './useAdminQuery.js';
import { QueryState } from './AdminUI.jsx';
import './Dashboard.css';

function MetricCard({ icon, label, value, change, chart }) {
  return (
    <div className="admin-metric-card">
      <div className="admin-metric-card__header">
        <div className="admin-metric-card__info">
          <span className="admin-metric-card__label">{label}</span>
          <div className="admin-metric-card__value-row">
            <strong className="admin-metric-card__value">{value}</strong>
            {change !== null && change !== undefined && (
              <span
                className={`admin-metric-card__badge${change < 0 ? ' admin-metric-card__badge--down' : ''}`}
              >
                <FontAwesomeIcon icon={change < 0 ? faArrowDown : faArrowUp} />
                {`${change > 0 ? '+' : ''}${change}%`}
              </span>
            )}
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
  const { session } = useAuth();
  const [year, setYear] = useState(String(new Date().getFullYear()));
  // Relative activity times need a clock; snapshot it once instead of reading
  // Date.now() during render.
  const [now] = useState(() => Date.now());
  const state = useAdminQuery('getAdminDashboard', { year });

  const number = new Intl.NumberFormat(language);
  const decimal = new Intl.NumberFormat(language, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const monthFormatter = new Intl.DateTimeFormat(language, { month: 'short' });

  const data = state.data;
  const monthly = data?.monthly ?? [];

  // The bar plot scales to however many months the payload returns.
  const plotWidth = 340;
  const step = plotWidth / Math.max(1, monthly.length);
  const peak = Math.max(1, ...monthly);

  // Activity timestamps read as relative times while they are recent.
  const activityTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    const hours = Math.round((now - date.getTime()) / 3600000);
    if (hours < 48) return t('admin.dashboard.hoursAgo', { count: Math.max(1, hours) });
    return formatDate(String(value), language);
  };

  const approvalResponse = data?.health?.approvalResponse;
  const satisfaction = data?.health?.satisfaction;

  return (
    <div className="admin-dashboard">
      <header className="admin-dashboard__header">
        <div>
          <h1>{t('admin.dashboard.welcome', { name: session?.name || 'Admin' })}</h1>
          <p>{t('admin.dashboard.subtitle')}</p>
        </div>
      </header>

      <QueryState state={state}>
        <div className="admin-dashboard__metrics">
          <MetricCard
            icon={faHospital}
            label={t('admin.dashboard.activeCenters')}
            value={number.format(data?.metrics?.centers?.value ?? 0)}
            change={data?.metrics?.centers?.change}
            chart={<MiniBarChart />}
          />
          <MetricCard
            icon={faUsers}
            label={t('admin.dashboard.registeredPatients')}
            value={number.format(data?.metrics?.patients?.value ?? 0)}
            change={data?.metrics?.patients?.change}
            chart={<MiniLineChart />}
          />
          <MetricCard
            icon={faUserDoctor}
            label={t('admin.dashboard.physiotherapists')}
            value={number.format(data?.metrics?.therapists?.value ?? 0)}
            change={data?.metrics?.therapists?.change}
            chart={<MiniBarChart />}
          />
        </div>

        <div className="admin-dashboard__grid">
          <Panel title={t('admin.dashboard.appointmentOverview')} className="admin-panel">
            <div className="admin-panel__header-actions">
              <FilterSelect
                value={year}
                onChange={setYear}
                ariaLabel={t('admin.dashboard.appointmentOverview')}
                options={[
                  { value: '2026', label: '2026' },
                  { value: '2025', label: '2025' },
                ]}
              />
            </div>
            <div className="admin-chart">
              <svg viewBox="0 0 400 200" aria-label="Monthly bookings chart">
                <g stroke="var(--color-border)" strokeWidth="1">
                  {[40, 80, 120, 160].map((y) => (
                    <line key={y} x1="40" y1={y} x2="380" y2={y} />
                  ))}
                </g>
                <g fill="var(--color-primary)" opacity="0.8">
                  {monthly.map((value, idx) => {
                    const height = Math.max(2, (value / peak) * 140);
                    const width = step * 0.6;
                    const x = 40 + step * idx + step * 0.2;
                    return <rect key={idx} x={x} y={160 - height} width={width} height={height} rx="3" />;
                  })}
                </g>
                <g fill="var(--color-text-secondary)" fontSize="10">
                  {monthly.map((_, idx) => (
                    <text key={idx} x={40 + step * idx + step / 2} y="190" textAnchor="middle">
                      {monthFormatter.format(new Date(2026, idx, 1))}
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
                    strokeDasharray={`${data?.health?.percent ?? 0} ${100 - (data?.health?.percent ?? 0)}`}
                    strokeDashoffset="25"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="admin-health__circle-text">
                  <strong>{`${data?.health?.percent ?? 0}%`}</strong>
                  <span>{t('admin.dashboard.healthy')}</span>
                </div>
              </div>
              <div className="admin-health__metrics">
                <div>
                  <span>{t('admin.dashboard.approvalResponse')}</span>
                  <strong>
                    {approvalResponse == null
                      ? '—'
                      : t('admin.dashboard.hours', {
                          count: typeof approvalResponse === 'number'
                            ? decimal.format(approvalResponse)
                            : approvalResponse,
                        })}
                  </strong>
                </div>
                <div>
                  <span>{t('admin.dashboard.satisfaction')}</span>
                  <strong>{satisfaction == null ? '—' : `${decimal.format(satisfaction)} / 5.0`}</strong>
                </div>
              </div>
            </div>
          </Panel>
        </div>

        <div className="admin-dashboard__grid admin-dashboard__grid--bottom">
          <Panel title={t('admin.dashboard.notifications')} className="admin-panel">
            <ul className="admin-notifications">
              {(data?.notifications ?? []).map((n) => (
                <li key={n.id} className="admin-notifications__item">
                  <span className={`admin-notifications__dot ${n.unread ? 'admin-notifications__dot--unread' : ''}`} />
                  <span className="admin-notifications__text">{localized(n.text, language)}</span>
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
                <strong>{number.format(data?.pending?.total ?? 0)}</strong>
                <span>{t('admin.dashboard.itemsNeedAttention', { count: number.format(data?.pending?.total ?? 0) })}</span>
              </div>
              <div className="admin-approvals__breakdown">
                <div>
                  <span>{t('admin.dashboard.centers')}</span>
                  <strong>{number.format(data?.pending?.centers ?? 0)}</strong>
                </div>
                <div>
                  <span>{t('admin.dashboard.therapists')}</span>
                  <strong>{number.format(data?.pending?.therapists ?? 0)}</strong>
                </div>
                <div>
                  <span>{t('admin.dashboard.reportedReviews')}</span>
                  <strong>{number.format(data?.pending?.reviews ?? 0)}</strong>
                </div>
              </div>
              <div className="admin-approvals__actions">
                <Link to="/admin/centers">{t('admin.dashboard.reviewCenters')}</Link>
                <Link to="/admin/physiotherapists">{t('admin.dashboard.reviewTherapists')}</Link>
                <Link to="/admin/reviews">{t('admin.dashboard.reviewReports')}</Link>
              </div>
            </div>
          </Panel>

          <Panel title={t('admin.dashboard.recentActivity')} className="admin-panel admin-panel--wide">
            <ul className="admin-activity">
              {(data?.activity ?? []).map((a) => (
                <li key={a.id} className="admin-activity__item">
                  <div>
                    <span className="admin-activity__text">{localized(a.text, language)}</span>
                    <span className="admin-activity__time">{activityTime(a.at)}</span>
                  </div>
                </li>
              ))}
            </ul>
            <button className="admin-panel__link-button">{t('center.viewAll')}</button>
          </Panel>
        </div>
      </QueryState>
    </div>
  );
}

export default AdminDashboard;
