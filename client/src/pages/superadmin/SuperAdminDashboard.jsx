import React, { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';

const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n ?? 0));
const fmtMoney = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0 });

function KPICard({ label, value, sub, subColor, color = '', icon }) {
  return (
    <div className={`sa-kpi ${color}`}>
      <div className="sa-kpi-icon">{icon}</div>
      <div className="sa-kpi-label">{label}</div>
      <div className="sa-kpi-value">{value}</div>
      <div className="sa-kpi-sub">
        <span className={subColor}>{sub}</span>
      </div>
    </div>
  );
}

function BarChart({ data, colorClass = '', height = 140 }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="sa-bar-chart" style={{ height }}>
      {data.map((d, i) => (
        <div className="sa-bar-col" key={i} title={`${d.label}: ${d.value}`}>
          <div
            className={`sa-bar ${colorClass}`}
            style={{ height: `${Math.max((d.value / max) * 100, 2)}%` }}
          />
          <div className="sa-bar-label">{d.label}</div>
        </div>
      ))}
    </div>
  );
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [sRes, aRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/analytics'),
      ]);
      setStats(sRes.data.stats || sRes.data);
      setAnalytics(aRes.data.analytics || aRes.data);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="sa-loading">
        <div className="sa-spinner" />
        <span>Loading dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sa-alert sa-alert-error">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        {error}
        <button className="sa-btn sa-btn-ghost sa-btn-sm" onClick={load} style={{ marginLeft: 'auto' }}>Retry</button>
      </div>
    );
  }

  // Backend returns revenueByMonth with { label, revenue } per entry
  const revenueData = (analytics?.revenueByMonth || analytics?.revenueChart || []).map(d => ({
    label: d.label || (d.month ? d.month.substring(0, 3) : ''),
    value: d.revenue || 0,
  }));

  // Backend returns messagesByDay with { _id: 'YYYY-MM-DD', count } per entry
  const msgData = (analytics?.messagesByDay || analytics?.dailyMessages || []).map(d => ({
    label: d._id ? d._id.slice(8) : (d.day ? String(d.day).padStart(2, '0') : ''),
    value: d.count || d.messages || 0,
  }));

  const planDist = analytics?.planDistribution || [];
  const maxPlanCount = Math.max(...planDist.map(p => p.count || 0), 1);

  const planColors = ['var(--sa-accent)', 'var(--sa-info)', 'var(--sa-purple)', 'var(--sa-warning)', 'var(--sa-danger)'];

  return (
    <>
      <div className="sa-page-header">
        <div>
          <div className="sa-page-title">Dashboard</div>
          <div className="sa-page-subtitle">Platform overview and key metrics</div>
        </div>
        <button className="sa-btn sa-btn-secondary sa-btn-sm" onClick={load}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* KPI Grid */}
      <div className="sa-kpi-grid">
        <KPICard
          label="Total Companies"
          value={fmt(stats?.totalCompanies)}
          sub={`+${stats?.thisMonthNewCompanies || 0} this month`}
          subColor="up"
          color="green"
          icon={<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>}
        />
        <KPICard
          label="Active Companies"
          value={fmt(stats?.activeCompanies)}
          sub={`${stats?.totalCompanies ? Math.round((stats.activeCompanies / stats.totalCompanies) * 100) : 0}% of total`}
          color="blue"
          icon={<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 12l2 2 4-4"/></svg>}
        />
        <KPICard
          label="Total Revenue"
          value={fmtMoney(stats?.totalRevenue)}
          sub={`${fmtMoney(stats?.thisMonthRevenue)} this month`}
          subColor="up"
          color="purple"
          icon={<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
        />
        <KPICard
          label="This Month Revenue"
          value={fmtMoney(stats?.thisMonthRevenue)}
          sub={`${stats?.thisMonthPaidInvoices || 0} invoices paid`}
          subColor="up"
          color="orange"
          icon={<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>}
        />
        <KPICard
          label="Total Messages"
          value={fmt(stats?.totalMessages)}
          sub={`${fmt(stats?.thisMonthMessages)} this month`}
          subColor="up"
          icon={<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
        />
        <KPICard
          label="Active Devices"
          value={fmt(stats?.connectedDevices ?? stats?.activeDevices)}
          sub={`of ${fmt(stats?.totalDevices)} total`}
          icon={<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>}
        />
        <KPICard
          label="Pending Invoices"
          value={fmt(stats?.pendingInvoices)}
          sub={fmtMoney(stats?.pendingRevenue) + ' outstanding'}
          subColor="down"
          color="orange"
          icon={<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}
        />
        <KPICard
          label="Total Plans"
          value={fmt(stats?.totalPlans)}
          sub="subscription tiers"
          icon={<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
        />
      </div>

      {/* Charts Row */}
      <div className="sa-chart-grid">
        {/* Revenue Chart */}
        <div className="sa-card">
          <div className="sa-card-header">
            <div>
              <div className="sa-card-title">Monthly Revenue</div>
              <div className="sa-card-subtitle">Last 12 months</div>
            </div>
          </div>
          <div className="sa-card-body">
            {revenueData.length > 0 ? (
              <BarChart data={revenueData} />
            ) : (
              <div className="sa-empty"><div className="sa-empty-desc">No revenue data yet</div></div>
            )}
          </div>
        </div>

        {/* Messages Chart */}
        <div className="sa-card">
          <div className="sa-card-header">
            <div>
              <div className="sa-card-title">Daily Messages</div>
              <div className="sa-card-subtitle">Last 30 days</div>
            </div>
          </div>
          <div className="sa-card-body">
            {msgData.length > 0 ? (
              <BarChart data={msgData} colorClass="blue" />
            ) : (
              <div className="sa-empty"><div className="sa-empty-desc">No message data yet</div></div>
            )}
          </div>
        </div>
      </div>

      {/* Plan Distribution + Top Companies Row */}
      <div className="sa-chart-grid">
        {/* Plan Distribution */}
        <div className="sa-card">
          <div className="sa-card-header">
            <div className="sa-card-title">Plan Distribution</div>
          </div>
          <div className="sa-card-body">
            {planDist.length > 0 ? (
              <div className="sa-plan-dist">
                {planDist.map((p, i) => (
                  <div className="sa-plan-row" key={p._id || i}>
                    <div className="sa-plan-name">{p.planName || p._id || 'Unknown'}</div>
                    <div className="sa-plan-bar-wrap">
                      <div
                        className="sa-plan-bar-fill"
                        style={{
                          width: `${Math.round((p.count / maxPlanCount) * 100)}%`,
                          background: planColors[i % planColors.length],
                        }}
                      />
                    </div>
                    <div className="sa-plan-count">{p.count}</div>
                    <div className="sa-plan-rev">{fmtMoney(p.revenue)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="sa-empty"><div className="sa-empty-desc">No plan data yet</div></div>
            )}
          </div>
        </div>

        {/* Top Companies */}
        <div className="sa-card">
          <div className="sa-card-header">
            <div className="sa-card-title">Top Companies</div>
            <div className="sa-card-subtitle">by revenue</div>
          </div>
          <div className="sa-table-wrap">
            <table className="sa-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Company</th>
                  <th>Plan</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {(analytics?.topCompanies || []).length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--sa-text-muted)' }}>
                      No data yet
                    </td>
                  </tr>
                ) : (
                  (analytics?.topCompanies || []).map((c, i) => (
                    <tr key={c._id || i}>
                      <td style={{ color: 'var(--sa-text-muted)' }}>{i + 1}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{c.companyName || c.name || 'Unknown'}</div>
                        <div style={{ fontSize: 11, color: 'var(--sa-text-muted)' }}>{c.email}</div>
                      </td>
                      <td>
                        <span className="sa-badge issued">{c.planName || '—'}</span>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--sa-accent)' }}>
                        {fmtMoney(c.revenue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
