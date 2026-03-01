import React, { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';

const STATUS_OPTIONS = ['', 'issued', 'paid', 'overdue', 'cancelled'];

function InvBadge({ status }) {
  return <span className={`sa-badge ${status || 'draft'}`}>{status || 'draft'}</span>;
}

function CreateModal({ onClose, onCreated }) {
  const [companies, setCompanies] = useState([]);
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState({ companyId: '', planId: '', durationDays: '30', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/admin/companies', { params: { limit: 100 } }),
      api.get('/admin/plans'),
    ]).then(([cRes, pRes]) => {
      setCompanies(cRes.data.companies || []);
      setPlans(pRes.data.plans || []);
    }).catch(() => {});
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const selectedPlan = plans.find(p => p._id === form.planId);

  const handleCreate = async () => {
    if (!form.companyId || !form.planId) {
      setError('Company and plan are required');
      return;
    }
    try {
      setSaving(true);
      setError('');
      await api.post('/admin/invoices', form);
      onCreated();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to create invoice');
    } finally {
      setSaving(false);
    }
  };

  const tax = selectedPlan ? selectedPlan.price * 0.18 : 0;
  const total = selectedPlan ? selectedPlan.price + tax : 0;

  return (
    <div className="sa-modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sa-modal">
        <div className="sa-modal-header">
          <span className="sa-modal-title">Create Invoice</span>
          <button className="sa-btn sa-btn-ghost sa-btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="sa-modal-body">
          {error && <div className="sa-alert sa-alert-error">{error}</div>}
          <div className="sa-form-group">
            <label className="sa-label">Company</label>
            <select className="sa-select" value={form.companyId} onChange={e => set('companyId', e.target.value)}>
              <option value="">— Select Company —</option>
              {companies.map(c => <option key={c._id} value={c._id}>{c.companyName || c.name} ({c.email})</option>)}
            </select>
          </div>
          <div className="sa-form-group">
            <label className="sa-label">Subscription Plan</label>
            <select className="sa-select" value={form.planId} onChange={e => set('planId', e.target.value)}>
              <option value="">— Select Plan —</option>
              {plans.map(p => <option key={p._id} value={p._id}>{p.name} — ${p.price}/{p.billingCycle || 'month'}</option>)}
            </select>
          </div>
          <div className="sa-form-row">
            <div className="sa-form-group">
              <label className="sa-label">Duration (days)</label>
              <input className="sa-input" type="number" min="1" value={form.durationDays} onChange={e => set('durationDays', e.target.value)} />
            </div>
          </div>
          <div className="sa-form-group">
            <label className="sa-label">Notes (optional)</label>
            <input className="sa-input" placeholder="Internal notes…" value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
          {selectedPlan && (
            <div style={{
              background: 'rgba(37,211,102,0.06)', border: '1px solid rgba(37,211,102,0.15)',
              borderRadius: 8, padding: '12px 16px', fontSize: 13
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: 'var(--sa-text-muted)' }}>
                <span>Subtotal ({selectedPlan.name})</span><span>${selectedPlan.price.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: 'var(--sa-text-muted)' }}>
                <span>Tax (18%)</span><span>${tax.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--sa-accent)' }}>
                <span>Total</span><span>${total.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
        <div className="sa-modal-footer">
          <button className="sa-btn sa-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="sa-btn sa-btn-primary" onClick={handleCreate} disabled={saving}>
            {saving ? 'Creating…' : 'Create Invoice'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [creating, setCreating] = useState(false);
  const LIMIT = 20;

  const load = useCallback(async (p = 1, s = statusFilter) => {
    try {
      setLoading(true);
      setError('');
      const params = { page: p, limit: LIMIT };
      if (s) params.status = s;
      const res = await api.get('/admin/invoices', { params });
      setInvoices(res.data.invoices || []);
      setTotal(res.data.pagination?.total || 0);
      setPage(p);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(1, statusFilter); }, [statusFilter]); // eslint-disable-line

  const handleMarkPaid = async (invoiceId) => {
    try {
      await api.put(`/admin/invoices/${invoiceId}/status`, { status: 'paid' });
      load(page, statusFilter);
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to mark as paid');
    }
  };

  const handleCancel = async (invoiceId) => {
    if (!window.confirm('Cancel this invoice?')) return;
    try {
      await api.put(`/admin/invoices/${invoiceId}/status`, { status: 'cancelled' });
      load(page, statusFilter);
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to cancel invoice');
    }
  };

  const totalPages = Math.ceil(total / LIMIT);
  const getAmt = (i) => i.amount?.totalAmount ?? i.amount ?? 0;
  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + getAmt(i), 0);

  return (
    <>
      <div className="sa-page-header">
        <div>
          <div className="sa-page-title">Invoices</div>
          <div className="sa-page-subtitle">{total} total invoices across all companies</div>
        </div>
        <button className="sa-btn sa-btn-primary" onClick={() => setCreating(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create Invoice
        </button>
      </div>

      {/* Summary KPIs */}
      <div className="sa-kpi-grid" style={{ marginBottom: 20 }}>
        <div className="sa-kpi green">
          <div className="sa-kpi-label">Paid This Page</div>
          <div className="sa-kpi-value">${totalRevenue.toLocaleString()}</div>
          <div className="sa-kpi-sub">from {invoices.filter(i => i.status === 'paid').length} invoices</div>
        </div>
        <div className="sa-kpi orange">
          <div className="sa-kpi-label">Outstanding</div>
          <div className="sa-kpi-value">
            ${invoices.filter(i => i.status === 'issued').reduce((s, i) => s + getAmt(i), 0).toLocaleString()}
          </div>
          <div className="sa-kpi-sub">{invoices.filter(i => i.status === 'issued').length} pending</div>
        </div>
        <div className="sa-kpi" style={{ '--kpi-c': 'var(--sa-danger)' }}>
          <div className="sa-kpi-label">Overdue</div>
          <div className="sa-kpi-value" style={{ color: 'var(--sa-danger)' }}>
            {invoices.filter(i => i.status === 'overdue').length}
          </div>
          <div className="sa-kpi-sub">need attention</div>
        </div>
      </div>

      {error && <div className="sa-alert sa-alert-error">{error}</div>}

      <div className="sa-card">
        {/* Filters */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--sa-card-border)' }}>
          <div className="sa-filters">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {STATUS_OPTIONS.map(s => (
                <button
                  key={s}
                  className={`sa-btn sa-btn-sm ${statusFilter === s ? 'sa-btn-primary' : 'sa-btn-secondary'}`}
                  onClick={() => setStatusFilter(s)}
                >
                  {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="sa-loading"><div className="sa-spinner" /><span>Loading…</span></div>
        ) : invoices.length === 0 ? (
          <div className="sa-empty">
            <div className="sa-empty-title">No invoices found</div>
            <div className="sa-empty-desc">Invoices will appear here once companies subscribe</div>
          </div>
        ) : (
          <div className="sa-table-wrap">
            <table className="sa-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Company</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Due</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv._id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--sa-text-muted)' }}>
                      {inv.invoiceNumber || inv._id?.slice(-8)}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{inv.companyId?.companyName || inv.companyId?.name || '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--sa-text-muted)' }}>{inv.companyId?.email}</div>
                    </td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {inv.description || inv.planId?.name || '—'}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--sa-accent)' }}>
                        ${(inv.amount?.totalAmount ?? inv.amount ?? 0).toLocaleString()}
                      </div>
                      {(inv.amount?.taxAmount ?? inv.tax ?? 0) > 0 && (
                        <div style={{ fontSize: 11, color: 'var(--sa-text-muted)' }}>
                          +${(inv.amount?.taxAmount ?? inv.tax).toLocaleString()} tax
                        </div>
                      )}
                    </td>
                    <td><InvBadge status={inv.status} /></td>
                    <td style={{ fontSize: 12, color: 'var(--sa-text-muted)' }}>
                      {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ fontSize: 12, color: inv.status === 'overdue' ? 'var(--sa-danger)' : 'var(--sa-text-muted)' }}>
                      {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                          <button
                            className="sa-btn sa-btn-primary sa-btn-sm"
                            onClick={() => handleMarkPaid(inv._id)}
                          >
                            Mark Paid
                          </button>
                        )}
                        {inv.status === 'issued' && (
                          <button
                            className="sa-btn sa-btn-danger sa-btn-sm"
                            onClick={() => handleCancel(inv._id)}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="sa-pagination">
            <span className="sa-pagination-info">
              Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
            </span>
            <div className="sa-pagination-btns">
              <button disabled={page <= 1} onClick={() => load(page - 1, statusFilter)}>← Prev</button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const n = i + Math.max(1, page - 2);
                if (n > totalPages) return null;
                return (
                  <button key={n} className={page === n ? 'active' : ''} onClick={() => load(n, statusFilter)}>{n}</button>
                );
              })}
              <button disabled={page >= totalPages} onClick={() => load(page + 1, statusFilter)}>Next →</button>
            </div>
          </div>
        )}
      </div>

      {creating && (
        <CreateModal onClose={() => setCreating(false)} onCreated={() => { setCreating(false); load(1, statusFilter); }} />
      )}
    </>
  );
}
