import React, { useEffect, useState, useCallback, useRef } from 'react';
import api from '../../services/api';

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Suspended' },
];

function Badge({ active }) {
  return active
    ? <span className="sa-badge active"><span className="sa-badge-dot" />Active</span>
    : <span className="sa-badge inactive"><span className="sa-badge-dot" />Suspended</span>;
}

function EditModal({ company, plans, onClose, onSaved }) {
  const [form, setForm] = useState({
    isActive: company.isActive !== false,
    isSubscriptionActive: company.isSubscriptionActive !== false,
    planId: company.subscriptionPlan?._id || company.subscriptionPlan || '',
    daysToAdd: '',
    role: company.role || 'user',
    name: company.companyName || company.name || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      const payload = { ...form };
      if (!payload.daysToAdd) delete payload.daysToAdd;
      await api.put(`/admin/companies/${company._id}`, payload);
      onSaved();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to update company');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="sa-modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sa-modal sa-modal-lg">
        <div className="sa-modal-header">
          <span className="sa-modal-title">Edit Company — {company.companyName || company.name}</span>
          <button className="sa-btn sa-btn-ghost sa-btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="sa-modal-body">
          {error && <div className="sa-alert sa-alert-error">{error}</div>}
          <div className="sa-form-row">
            <div className="sa-form-group">
              <label className="sa-label">Company Name</label>
              <input className="sa-input" value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div className="sa-form-group">
              <label className="sa-label">Role</label>
              <select className="sa-select" value={form.role} onChange={e => set('role', e.target.value)}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="sa-form-row">
            <div className="sa-form-group">
              <label className="sa-label">Subscription Plan</label>
              <select className="sa-select" value={form.planId} onChange={e => set('planId', e.target.value)}>
                <option value="">— Select Plan —</option>
                {plans.map(p => (
                  <option key={p._id} value={p._id}>{p.name} (${p.price}/mo)</option>
                ))}
              </select>
            </div>
            <div className="sa-form-group">
              <label className="sa-label">Extend Subscription (days)</label>
              <input
                className="sa-input"
                type="number"
                min="0"
                placeholder="e.g. 30"
                value={form.daysToAdd}
                onChange={e => set('daysToAdd', e.target.value)}
              />
              <div className="sa-form-hint">Current expiry: {company.subscriptionEndDate ? new Date(company.subscriptionEndDate).toLocaleDateString() : 'N/A'}</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="sa-toggle-wrap">
              <div>
                <div className="sa-toggle-label">Account Active</div>
                <div className="sa-toggle-desc">Allow this company to log in and use the platform</div>
              </div>
              <label className="sa-toggle">
                <input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} />
                <span className="sa-toggle-slider" />
              </label>
            </div>
            <div className="sa-toggle-wrap">
              <div>
                <div className="sa-toggle-label">Subscription Active</div>
                <div className="sa-toggle-desc">Allow access to paid features regardless of expiry</div>
              </div>
              <label className="sa-toggle">
                <input type="checkbox" checked={form.isSubscriptionActive} onChange={e => set('isSubscriptionActive', e.target.checked)} />
                <span className="sa-toggle-slider" />
              </label>
            </div>
          </div>
        </div>
        <div className="sa-modal-footer">
          <button className="sa-btn sa-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="sa-btn sa-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailModal({ company, onClose, onEdit }) {
  return (
    <div className="sa-modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sa-modal sa-modal-xl">
        <div className="sa-modal-header">
          <span className="sa-modal-title">{company.companyName || company.name}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="sa-btn sa-btn-secondary sa-btn-sm" onClick={onEdit}>Edit</button>
            <button className="sa-btn sa-btn-ghost sa-btn-icon" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="sa-modal-body">
          <div className="sa-form-row" style={{ marginBottom: 20 }}>
            <div>
              <div className="sa-label">Email</div>
              <div style={{ color: 'var(--sa-text)', fontSize: 14 }}>{company.email}</div>
            </div>
            <div>
              <div className="sa-label">Status</div>
              <Badge active={company.isActive !== false} />
            </div>
            <div>
              <div className="sa-label">Role</div>
              <span className={`sa-badge ${company.role === 'admin' ? 'admin-role' : 'user-role'}`}>{company.role || 'user'}</span>
            </div>
            <div>
              <div className="sa-label">Plan</div>
              <span className="sa-badge issued">{company.subscriptionPlan?.name || 'None'}</span>
            </div>
          </div>
          <div className="sa-form-row" style={{ marginBottom: 20 }}>
            <div>
              <div className="sa-label">Devices</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--sa-accent)' }}>{company.deviceCount ?? 0}</div>
            </div>
            <div>
              <div className="sa-label">Messages Sent</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--sa-info)' }}>{(company.messageCount ?? 0).toLocaleString()}</div>
            </div>
            <div>
              <div className="sa-label">Subscription Ends</div>
              <div style={{ fontSize: 14, color: 'var(--sa-text)' }}>
                {company.subscriptionEndDate ? new Date(company.subscriptionEndDate).toLocaleDateString() : '—'}
              </div>
            </div>
            <div>
              <div className="sa-label">Registered</div>
              <div style={{ fontSize: 14, color: 'var(--sa-text)' }}>
                {company.createdAt ? new Date(company.createdAt).toLocaleDateString() : '—'}
              </div>
            </div>
          </div>

          {company.recentInvoices?.length > 0 && (
            <>
              <div className="sa-label" style={{ marginBottom: 8 }}>Recent Invoices</div>
              <div className="sa-table-wrap">
                <table className="sa-table">
                  <thead>
                    <tr>
                      <th>Date</th><th>Amount</th><th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {company.recentInvoices.map(inv => (
                      <tr key={inv._id}>
                        <td>{new Date(inv.createdAt).toLocaleDateString()}</td>
                        <td style={{ color: 'var(--sa-accent)', fontWeight: 600 }}>${inv.amount}</td>
                        <td><span className={`sa-badge ${inv.status}`}>{inv.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminCompanies() {
  const [companies, setCompanies] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null); // detail modal
  const [editing, setEditing] = useState(null);   // edit modal
  const [keyGenId, setKeyGenId] = useState(null);
  const [keyGenLoading, setKeyGenLoading] = useState(false);
  const [generatedKey, setGeneratedKey] = useState('');
  const searchTimer = useRef(null);
  const LIMIT = 15;

  const loadPlans = useCallback(async () => {
    try {
      const res = await api.get('/admin/plans');
      setPlans(res.data.plans || []);
    } catch {}
  }, []);

  const load = useCallback(async (p = 1, q = search, s = statusFilter) => {
    try {
      setLoading(true);
      setError('');
      const params = { page: p, limit: LIMIT };
      if (q) params.search = q;
      if (s) params.status = s;
      const res = await api.get('/admin/companies', { params });
      setCompanies(res.data.companies || []);
      setTotal(res.data.pagination?.total || 0);
      setPage(p);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { loadPlans(); }, [loadPlans]);
  useEffect(() => { load(1, search, statusFilter); }, [statusFilter]); // eslint-disable-line

  const handleSearch = (val) => {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(1, val, statusFilter), 400);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete company "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/companies/${id}`);
      load(page);
    } catch (e) {
      alert(e.response?.data?.error || 'Delete failed');
    }
  };

  const handleGenKey = async (companyId) => {
    try {
      setKeyGenLoading(true);
      setKeyGenId(companyId);
      const res = await api.post(`/admin/companies/${companyId}/api-key`);
      setGeneratedKey(res.data.apiKey);
    } catch (e) {
      alert(e.response?.data?.error || 'Key generation failed');
      setKeyGenId(null);
    } finally {
      setKeyGenLoading(false);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <>
      <div className="sa-page-header">
        <div>
          <div className="sa-page-title">Companies</div>
          <div className="sa-page-subtitle">{total} total companies registered</div>
        </div>
      </div>

      {error && <div className="sa-alert sa-alert-error">{error}</div>}

      {/* Generated Key Banner */}
      {generatedKey && (
        <div className="sa-alert sa-alert-success" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
          <div style={{ fontWeight: 600 }}>API Key Generated</div>
          <code style={{
            background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: 6,
            fontSize: 12, fontFamily: 'monospace', wordBreak: 'break-all', width: '100%'
          }}>
            {generatedKey}
          </code>
          <div style={{ fontSize: 11, opacity: 0.8 }}>Copy this key — it will not be shown again.</div>
          <button className="sa-btn sa-btn-ghost sa-btn-sm" onClick={() => { setGeneratedKey(''); setKeyGenId(null); }}>Dismiss</button>
        </div>
      )}

      <div className="sa-card">
        {/* Filters */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--sa-card-border)' }}>
          <div className="sa-filters">
            <div className="sa-search-wrap">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                placeholder="Search by name or email…"
                value={search}
                onChange={e => handleSearch(e.target.value)}
              />
            </div>
            <select
              className="sa-select"
              style={{ width: 'auto', minWidth: 140 }}
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); load(1, search, e.target.value); }}
            >
              {STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="sa-loading"><div className="sa-spinner" /><span>Loading…</span></div>
        ) : companies.length === 0 ? (
          <div className="sa-empty">
            <div className="sa-empty-title">No companies found</div>
            <div className="sa-empty-desc">Try adjusting your search or filters</div>
          </div>
        ) : (
          <div className="sa-table-wrap">
            <table className="sa-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Messages</th>
                  <th>Expiry</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {companies.map(c => (
                  <tr key={c._id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{c.companyName || c.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--sa-text-muted)' }}>{c.email}</div>
                    </td>
                    <td>
                      <span className="sa-badge issued">{c.subscriptionPlan?.name || '—'}</span>
                    </td>
                    <td><Badge active={c.isActive !== false} /></td>
                    <td style={{ color: 'var(--sa-text-muted)' }}>
                      {(c.usageStats?.totalMessagesAllTime || c.usageStats?.messagesThisMonth || 0).toLocaleString()}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--sa-text-muted)' }}>
                      {c.subscriptionEndDate ? new Date(c.subscriptionEndDate).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <span className={`sa-badge ${c.role === 'admin' ? 'admin-role' : 'user-role'}`}>
                        {c.role || 'user'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="sa-btn sa-btn-ghost sa-btn-sm"
                          onClick={async () => {
                            try {
                              const res = await api.get(`/admin/companies/${c._id}`);
                              setSelected({
                                ...res.data.company,
                                deviceCount: res.data.stats?.devices,
                                messageCount: res.data.stats?.totalMessages,
                                recentInvoices: res.data.recentInvoices || [],
                              });
                            } catch { setSelected(c); }
                          }}
                          title="View details"
                        >
                          👁
                        </button>
                        <button
                          className="sa-btn sa-btn-secondary sa-btn-sm"
                          onClick={() => setEditing(c)}
                          title="Edit"
                        >
                          Edit
                        </button>
                        <button
                          className="sa-btn sa-btn-ghost sa-btn-sm"
                          onClick={() => handleGenKey(c._id)}
                          disabled={keyGenLoading && keyGenId === c._id}
                          title="Generate API Key"
                        >
                          🔑
                        </button>
                        <button
                          className="sa-btn sa-btn-danger sa-btn-sm"
                          onClick={() => handleDelete(c._id, c.companyName || c.name)}
                          title="Delete"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="sa-pagination">
            <span className="sa-pagination-info">
              Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
            </span>
            <div className="sa-pagination-btns">
              <button disabled={page <= 1} onClick={() => load(page - 1)}>← Prev</button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const n = i + Math.max(1, page - 2);
                if (n > totalPages) return null;
                return (
                  <button key={n} className={page === n ? 'active' : ''} onClick={() => load(n)}>{n}</button>
                );
              })}
              <button disabled={page >= totalPages} onClick={() => load(page + 1)}>Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <DetailModal
          company={selected}
          onClose={() => setSelected(null)}
          onEdit={() => { setEditing(selected); setSelected(null); }}
        />
      )}

      {/* Edit Modal */}
      {editing && (
        <EditModal
          company={editing}
          plans={plans}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(page); }}
        />
      )}
    </>
  );
}
