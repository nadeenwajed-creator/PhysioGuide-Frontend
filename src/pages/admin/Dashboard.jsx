import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowUp,
  faArrowDown,
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
import { activityPath } from './activityLinks.js';
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

// Every sparkline plots the metric's real monthly series. The peak month fills
// the box so the shape stays readable whatever the absolute numbers are.
function MiniBarChart({ values = [] }) {
  const peak = Math.max(1, ...values);
  const step = 100 / Math.max(1, values.length);
  return (
    <svg className="admin-mini-chart" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
      {values.map((value, index) => {
        const height = Math.max(1, (value / peak) * 26);
        return (
          <rect
            key={index}
            x={index * step + step * 0.15}
            y={28 - height}
            width={step * 0.7}
            height={height}
            rx="1"
          />
        );
      })}
    </svg>
  );
}

function AdminDashboard() {
  const { t, language } = useLanguage();
  const { session } = useAuth();
  // Relative activity times and the year list need a clock; snapshot it once
  // instead of reading Date.now() during render.
  const [now] = useState(() => Date.now());
  const [year, setYear] = useState(() => String(new Date(now).getFullYear()));
  const currentYear = new Date(now).getFullYear();
  const yearOptions = [currentYear, currentYear - 1].map((value) => ({
    value: String(value),
    label: String(value),
  }));
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
          <h1>
            {t("admin.dashboard.welcome", { name: session?.name || "Admin" })}
          </h1>
          <p>{t("admin.dashboard.subtitle")}</p>
        </div>
      </header>

      <QueryState state={state}>
        <div className="admin-dashboard__metrics">
          <MetricCard
            icon={faHospital}
            label={t("admin.dashboard.activeCenters")}
            value={number.format(data?.metrics?.centers?.value ?? 0)}
            change={data?.metrics?.centers?.change}
            chart={<MiniBarChart values={data?.metrics?.centers?.series} />}
          />
          <MetricCard
            icon={faUsers}
            label={t("admin.dashboard.registeredPatients")}
            value={number.format(data?.metrics?.patients?.value ?? 0)}
            change={data?.metrics?.patients?.change}
            chart={<MiniBarChart values={data?.metrics?.patients?.series} />}
          />
          <MetricCard
            icon={faUserDoctor}
            label={t("admin.dashboard.physiotherapists")}
            value={number.format(data?.metrics?.therapists?.value ?? 0)}
            change={data?.metrics?.therapists?.change}
            chart={<MiniBarChart values={data?.metrics?.therapists?.series} />}
          />
        </div>

        <div className="admin-dashboard__grid">
          <Panel
            title={t("admin.dashboard.appointmentOverview")}
            className="admin-panel"
          >
            <div className="admin-panel__header-actions">
              <FilterSelect
                value={year}
                onChange={setYear}
                ariaLabel={t("admin.dashboard.appointmentOverview")}
                options={yearOptions}
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
                    return (
                      <rect
                        key={idx}
                        x={x}
                        y={160 - height}
                        width={width}
                        height={height}
                        rx="3"
                      />
                    );
                  })}
                </g>
                <g fill="var(--color-text-secondary)" fontSize="10">
                  {monthly.map((_, idx) => (
                    <text
                      key={idx}
                      x={40 + step * idx + step / 2}
                      y="190"
                      textAnchor="middle"
                    >
                      {monthFormatter.format(new Date(Number(year), idx, 1))}
                    </text>
                  ))}
                </g>
              </svg>
            </div>
          </Panel>

          <Panel
            title={t("admin.dashboard.platformHealth")}
            className="admin-panel"
          >
            <div className="admin-health">
              <div className="admin-health__circle">
                <svg viewBox="0 0 42 42">
                  <circle
                    cx="21"
                    cy="21"
                    r="15.91549430918954"
                    fill="transparent"
                    stroke="var(--color-border)"
                    strokeWidth="3"
                  />
                  <circle
                    cx="21"
                    cy="21"
                    r="15.91549430918954"
                    fill="transparent"
                    stroke="var(--color-success)"
                    strokeWidth="3"
                    strokeDasharray={`${data?.health?.percent ?? 0} ${
                      100 - (data?.health?.percent ?? 0)
                    }`}
                    strokeDashoffset="25"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="admin-health__circle-text">
                  <strong>{`${data?.health?.percent ?? 0}%`}</strong>
                  <span>{t("admin.dashboard.healthy")}</span>
                </div>
              </div>
              <div className="admin-health__metrics">
                <div>
                  <span>{t("admin.dashboard.approvalResponse")}</span>
                  <strong>
                    {approvalResponse == null
                      ? "—"
                      : t("admin.dashboard.hours", {
                          count:
                            typeof approvalResponse === "number"
                              ? decimal.format(approvalResponse)
                              : approvalResponse,
                        })}
                  </strong>
                </div>
                <div>
                  <span>{t("admin.dashboard.satisfaction")}</span>
                  <strong>
                    {satisfaction == null
                      ? "—"
                      : `${decimal.format(satisfaction)} / 5.0`}
                  </strong>
                </div>
              </div>
            </div>
          </Panel>
        </div>

        <div className="admin-dashboard__grid">
          <Panel
            title={t("admin.dashboard.recentActivity")}
            action={
              <Link to="/admin/activity" className="admin-panel__link-button">
                {t("center.viewAll")}
              </Link>
            }
            className="admin-panel"
          >
            <ul className="admin-activity">
              {(data?.activity ?? []).map((a) => {
                const target = activityPath(a.kind, a.relatedId);
                const body = (
                  <>
                    <span className="admin-activity__text">
                      {localized(a.text, language)}
                    </span>
                    <span className="admin-activity__time">
                      {activityTime(a.at)}
                    </span>
                  </>
                );
                return (
                  <li key={a.id} className="admin-activity__item">
                    {target ? (
                      <Link to={target} className="admin-activity__item-link">
                        {body}
                      </Link>
                    ) : (
                      <div>{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
            {(data?.activity ?? []).length === 0 && (
              <p className="admin-panel__empty">
                {t("admin.dashboard.noActivity")}
              </p>
            )}
          </Panel>
          <Panel
            title={t("admin.dashboard.pendingApprovals")}
            className="admin-panel"
          >
            <div className="admin-approvals">
              <div className="admin-approvals__count">
                <strong>{number.format(data?.pending?.total ?? 0)}</strong>
                <span>
                  {t("admin.dashboard.itemsNeedAttention", {
                    count: number.format(data?.pending?.total ?? 0),
                  })}
                </span>
              </div>
              <div className="admin-approvals__breakdown">
                <div>
                  <span>
                    <Link
                      to="/admin/centers"
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      {t("admin.dashboard.centers")}
                    </Link>
                  </span>
                  <strong>{number.format(data?.pending?.centers ?? 0)}</strong>
                </div>
                <div>
                  <span>
                    <Link
                      to="/admin/physiotherapists"
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      {t("admin.dashboard.therapists")}
                    </Link>
                  </span>
                  <strong>
                    {number.format(data?.pending?.therapists ?? 0)}
                  </strong>
                </div>
                <div>
                  <Link
                    to="/admin/reviews"
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    {t("admin.dashboard.reportedReviews")}
                  </Link>
                  <strong>{number.format(data?.pending?.reviews ?? 0)}</strong>
                </div>
              </div>
              <div className="admin-approvals__actions"></div>
            </div>
          </Panel>
        </div>
      </QueryState>
    </div>
  );
}

export default AdminDashboard;
