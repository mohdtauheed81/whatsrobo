import React, { useEffect, useState } from 'react';
import { Edit2, Trash2, Plus, Loader, AlertCircle, Check } from 'lucide-react';
import api from '../services/api';
import '../styles/admin.css';

const AVAILABLE_FEATURES = ['manual_messaging', 'bulk_messaging', 'auto_reply', 'api_access', 'advanced_analytics'];

function AdminPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [formData, setFormData] = useState({
    name: '', price: '', maxDevices: '', monthlyMessageLimit: '',
    description: '', features: [], isActive: true
  });

  useEffect(() => { loadPlans(); }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/plans');
      setPlans(res.data.plans || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingPlan(null);
    setFormData({ name: '', price: '', maxDevices: '', monthlyMessageLimit: '', description: '', features: [], isActive: true });
    setShowModal(true);
  };

  const openEdit = (plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name, price: plan.price, maxDevices: plan.maxDevices,
      monthlyMessageLimit: plan.monthlyMessageLimit, description: plan.description || '',
      features: plan.features || [], isActive: plan.isActive
    });
    setShowModal(true);
  };

  const handleFeatureToggle = (feature) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        ...formData,
        price: Number(formData.price),
        maxDevices: Number(formData.maxDevices),
        monthlyMessageLimit: Number(formData.monthlyMessageLimit)
      };
      if (editingPlan) {
        const res = await api.put('/admin/plans/' + editingPlan._id, payload);
        setPlans(prev => prev.map(p => p._id === editingPlan._id ? res.data.plan : p));
        setSuccessMsg('Plan updated successfully');
      } else {
        const res = await api.post('/admin/plans', payload);
        setPlans(prev => [...prev, res.data.plan]);
        setSuccessMsg('Plan created successfully');
      }
      setShowModal(false);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (planId) => {
    if (!window.confirm('Delete this plan?')) return;
    try {
      setDeleting(planId);
      await api.delete('/admin/plans/' + planId);
      setPlans(prev => prev.filter(p => p._id !== planId));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete plan');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="admin-plans">
        <div className="loading-state"><Loader size={32} className="spinner" /></div>
      </div>
    );
  }

  return (
    <div className="admin-plans">
      <div className="admin-header">
        <h1>Subscription Plans</h1>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={20} /> Add Plan
        </button>
      </div>

      {error && <div className="alert alert-error"><AlertCircle size={18} /> {error}</div>}
      {successMsg && <div className="alert alert-success"><Check size={18} /> {successMsg}</div>}

      <div className="plans-admin-grid">
        {plans.map(plan => (
          <div key={plan._id} className="plan-admin-card">
            <div className="plan-header">
              <h3>{plan.name}</h3>
              {!plan.isActive && <span className="badge inactive">Inactive</span>}
            </div>
            <div className="plan-details">
              <p><strong>Price:</strong> ${plan.price}/month</p>
              <p><strong>Devices:</strong> {plan.maxDevices}</p>
              <p><strong>Messages:</strong> {plan.monthlyMessageLimit.toLocaleString()}/month</p>
              <div className="plan-features">
                <strong>Features:</strong>
                <ul>{plan.features.map(f => <li key={f}>{f.replace(/_/g, ' ')}</li>)}</ul>
              </div>
            </div>
            <div className="plan-actions">
              <button className="btn-secondary" onClick={() => openEdit(plan)}>
                <Edit2 size={16} /> Edit
              </button>
              <button className="btn-danger" disabled={deleting === plan._id} onClick={() => handleDelete(plan._id)}>
                {deleting === plan._id ? <Loader size={16} className="spinner" /> : <Trash2 size={16} />}
                {' '}Delete
              </button>
            </div>
          </div>
        ))}
        {plans.length === 0 && <p>No plans yet. Create one to get started!</p>}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-large" onClick={e => e.stopPropagation()}>
            <h2>{editingPlan ? 'Edit Plan' : 'Add New Plan'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Plan Name *</label>
                  <select value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required>
                    <option value="">Select name...</option>
                    <option value="Starter">Starter</option>
                    <option value="Professional">Professional</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Price (USD/month) *</label>
                  <input
                    type="number" min="0"
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Max Devices *</label>
                  <input
                    type="number" min="1" max="5"
                    value={formData.maxDevices}
                    onChange={e => setFormData({...formData, maxDevices: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Monthly Message Limit *</label>
                  <input
                    type="number" min="1000"
                    value={formData.monthlyMessageLimit}
                    onChange={e => setFormData({...formData, monthlyMessageLimit: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Optional plan description"
                />
              </div>
              <div className="form-group">
                <label>Features</label>
                <div className="feature-checkboxes">
                  {AVAILABLE_FEATURES.map(f => (
                    <label key={f} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.features.includes(f)}
                        onChange={() => handleFeatureToggle(f)}
                      />
                      {f.replace(/_/g, ' ')}
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={e => setFormData({...formData, isActive: e.target.checked})}
                  />
                  Active
                </label>
              </div>
              <div className="modal-buttons">
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Plan'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPlans;
