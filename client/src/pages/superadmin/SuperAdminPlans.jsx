import React, { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';

const DEFAULT_FEATURES = [
  'manual_messaging',
  'bulk_messaging',
  'auto_reply',
  'api_access',
  'analytics',
  'webhooks',
];

function PlanModal({ plan, onClose, onSaved }) {
  const isEdit = !!plan;
  const [form, setForm] = useState(
    isEdit
      ? {
          name: plan.name || '',
          price: plan.price || '',
          billingCycle: plan.billingCycle || 'monthly',
          description: plan.description || '',
          maxDevices: plan.maxDevices || 1,
          maxMessages: plan.maxMessages || 1000,
          features: plan.features || [],
          isActive: plan.isActive !== false,
        }
      : {
          name: '',
          price: '',
          billingCycle: 'monthly',
          description: '',
          maxDevices: 1,
          maxMessages: 1000,
          features: ['manual_messaging'],
          isActive: true,
        }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleFeature = (feat) => {
    setForm(f => ({
      ...f,
      features: f.features.includes(feat)
        ? f.features.filter(x => x !== feat)
        : [...f.features, feat],
    }));
  };

  const handleSave = async () => {
    if (!form.name || !form.price) { setError('Name and price are required'); return; }
    try {
      setSaving(true);
      setError('');
      if (isEdit) {
        await api.put(`/admin/plans/${plan._id}`, form);
      } else {
        await api.post('/admin/plans', form);
      }
      onSaved();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="sa-modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sa-modal sa-modal-lg">
        <div className="sa-modal-header">
          <span className="sa-modal-title">{isEdit ? `Edit — ${plan.name}` : 'Create New Plan'}</span>
          <button className="sa-btn sa-btn-ghost sa-btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="sa-modal-body">
          {error && <div className="sa-alert sa-alert-error">{error}</div>}
          <div className="sa-form-row">
            <div className="sa-form-group">
              <label className="sa-label">Plan Name</label>
              <input className="sa-input" value={form.name} placeholder="e.g. Pro, Starter" onChange={e => set('name', e.target.value)} />
            </div>
            <div className="sa-form-group">
              <label className="sa-label">Billing Cycle</label>
              <select className="sa-select" value={form.billingCycle} onChange={e => set('billingCycle', e.target.value)}>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>
          <div className="sa-form-row">
            <div className="sa-form-group">
              <label className="sa-label">Price ($)</label>
              <input className="sa-input" type="number" min="0" step="0.01" value={form.price} onChange={e => set('price', e.target.value)} />
            </div>
            <div className="sa-form-group">
              <label className="sa-label">Max Devices</label>
              <input className="sa-input" type="number" min="1" value={form.maxDevices} onChange={e => set('maxDevices', Number(e.target.value))} />
            </div>
          </div>
          <div className="sa-form-group">
            <label className="sa-label">Monthly Message Limit</label>
            <input className="sa-input" type="number" min="1" value={form.maxMessages} onChange={e => set('maxMessages', Number(e.target.value))} />
            <div className="sa-form-hint">Set to 999999 for unlimited messages</div>
          </div>
          <div className="sa-form-group">
            <label className="sa-label">Description</label>
            <textarea className="sa-textarea" rows={2} value={form.description} placeholder="Brief plan description…" onChange={e => set('description', e.target.value)} />
          </div>
          <div className="sa-form-group">
            <label className="sa-label">Features</label>
            <div className="sa-feature-grid">
              {DEFAULT_FEATURES.map(feat => (
                <label
                  key={feat}
                  className={`sa-feature-item ${form.features.includes(feat) ? 'checked' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={form.features.includes(feat)}
                    onChange={() => toggleFeature(feat)}
                  />
                  {feat.replace(/_/g, ' ')}
                </label>
              ))}
            </div>
          </div>
          <div className="sa-toggle-wrap">
            <div>
              <div className="sa-toggle-label">Plan Active</div>
              <div className="sa-toggle-desc">Inactive plans are hidden from the subscription page</div>
            </div>
            <label className="sa-toggle">
              <input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} />
              <span className="sa-toggle-slider" />
            </label>
          </div>
        </div>
        <div className="sa-modal-footer">
          <button className="sa-btn sa-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="sa-btn sa-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Plan'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null); // null | 'create' | plan_object

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/admin/plans');
      setPlans(res.data.plans || []);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete plan "${name}"? Companies on this plan won't be affected, but new subscriptions won't be possible.`)) return;
    try {
      await api.delete(`/admin/plans/${id}`);
      load();
    } catch (e) {
      alert(e.response?.data?.error || 'Delete failed');
    }
  };

  const totalRevenue = plans.reduce((s, p) => s + (p.monthlyRevenue || 0), 0);
  const totalSubs = plans.reduce((s, p) => s + (p.subscriberCount || 0), 0);

  return (
    <>
      <div className="sa-page-header">
        <div>
          <div className="sa-page-title">Subscription Plans</div>
          <div className="sa-page-subtitle">{plans.length} plans — {totalSubs} total subscribers</div>
        </div>
        <button className="sa-btn sa-btn-primary" onClick={() => setModal('create')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Plan
        </button>
      </div>

      {error && <div className="sa-alert sa-alert-error">{error}</div>}

      {/* Revenue summary */}
      <div className="sa-kpi-grid" style={{ marginBottom: 20 }}>
        <div className="sa-kpi green">
          <div className="sa-kpi-label">Monthly Revenue</div>
          <div className="sa-kpi-value">${totalRevenue.toLocaleString()}</div>
          <div className="sa-kpi-sub">from {totalSubs} subscribers</div>
        </div>
        <div className="sa-kpi blue">
          <div className="sa-kpi-label">Total Subscribers</div>
          <div className="sa-kpi-value">{totalSubs}</div>
          <div className="sa-kpi-sub">across {plans.length} plans</div>
        </div>
      </div>

      {loading ? (
        <div className="sa-loading"><div className="sa-spinner" /><span>Loading…</span></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {plans.map(plan => (
            <div key={plan._id} className="sa-card" style={{ position: 'relative' }}>
              {!plan.isActive && (
                <div style={{
                  position: 'absolute', top: 12, right: 12,
                  background: 'rgba(248,81,73,0.12)', color: 'var(--sa-danger)',
                  border: '1px solid rgba(248,81,73,0.25)', borderRadius: 20,
                  fontSize: 11, fontWeight: 600, padding: '2px 8px'
                }}>Inactive</div>
              )}
              <div className="sa-card-header">
                <div>
                  <div className="sa-card-title" style={{ fontSize: 18 }}>{plan.name}</div>
                  <div className="sa-card-subtitle">{plan.description}</div>
                </div>
              </div>
              <div className="sa-card-body">
                {/* Pricing */}
                <div style={{ marginBottom: 16 }}>
                  <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--sa-accent)' }}>${plan.price}</span>
                  <span style={{ color: 'var(--sa-text-muted)', fontSize: 13 }}>/{plan.billingCycle || 'month'}</span>
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--sa-info)' }}>{plan.subscriberCount || 0}</div>
                    <div style={{ fontSize: 11, color: 'var(--sa-text-muted)' }}>Subscribers</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--sa-purple)' }}>${(plan.monthlyRevenue || 0).toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: 'var(--sa-text-muted)' }}>Revenue</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--sa-warning)' }}>{plan.maxDevices}</div>
                    <div style={{ fontSize: 11, color: 'var(--sa-text-muted)' }}>Devices</div>
                  </div>
                </div>

                {/* Features */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: 'var(--sa-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Features</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(plan.features || []).map(f => (
                      <span key={f} className="sa-badge active" style={{ fontSize: 10 }}>
                        {f.replace(/_/g, ' ')}
                      </span>
                    ))}
                    {(plan.features || []).length === 0 && (
                      <span style={{ color: 'var(--sa-text-muted)', fontSize: 12 }}>No features</span>
                    )}
                  </div>
                </div>

                {/* Limits */}
                <div style={{ fontSize: 12, color: 'var(--sa-text-muted)', marginBottom: 16 }}>
                  {plan.maxMessages >= 999999 ? 'Unlimited' : plan.maxMessages?.toLocaleString()} messages/month
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="sa-btn sa-btn-secondary sa-btn-sm" onClick={() => setModal(plan)}>
                    Edit Plan
                  </button>
                  <button className="sa-btn sa-btn-danger sa-btn-sm" onClick={() => handleDelete(plan._id, plan.name)}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}

          {plans.length === 0 && (
            <div className="sa-empty" style={{ gridColumn: '1 / -1' }}>
              <div className="sa-empty-title">No plans yet</div>
              <div className="sa-empty-desc">Create your first subscription plan to get started</div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <PlanModal
          plan={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </>
  );
}
