import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchRules, createRule, updateRule, deleteRule, testRule } from '../redux/autoreplySlice';
import { fetchDevices } from '../redux/devicesSlice';
import { Plus, Trash2, Edit2, TestTube } from 'lucide-react';
import '../styles/autoreply.css';

function AutoReplyPage() {
  const dispatch = useDispatch();
  const { rules, loading, testResult } = useSelector(state => state.autoreply);
  const { devices } = useSelector(state => state.devices);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [testMessage, setTestMessage] = useState('');
  const [testingRuleId, setTestingRuleId] = useState(null);
  const [formData, setFormData] = useState({
    deviceId: '', name: '', description: '',
    triggerType: 'keyword', keywords: '', pattern: '',
    responseType: 'fixed', responseMessage: '', isActive: true
  });

  useEffect(() => {
    dispatch(fetchRules());
    dispatch(fetchDevices());
  }, [dispatch]);

  const connectedDevices = devices.filter(d => d.status === 'connected');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const keywords = formData.keywords.split(',').map(k => k.trim()).filter(k => k);
    const ruleData = { ...formData, keywords };
    
    if (editingRule) {
      await dispatch(updateRule({ ruleId: editingRule._id, ...ruleData }));
    } else {
      await dispatch(createRule(ruleData));
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      deviceId: '', name: '', description: '',
      triggerType: 'keyword', keywords: '', pattern: '',
      responseType: 'fixed', responseMessage: '', isActive: true
    });
    setEditingRule(null);
    setShowForm(false);
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setFormData({ ...rule, keywords: (rule.keywords || []).join(', ') });
    setShowForm(true);
  };

  const handleDelete = (ruleId) => {
    if (window.confirm('Delete this rule?')) {
      dispatch(deleteRule(ruleId));
    }
  };

  const handleTest = async () => {
    if (testingRuleId && testMessage) {
      await dispatch(testRule({ ruleId: testingRuleId, testMessage }));
    }
  };

  return (
    <div className="autoreply-page">
      <div className="page-header">
        <h1>Auto-Reply Rules</h1>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={20} /> Create Rule
        </button>
      </div>

      <div className="rules-container">
        {rules.length === 0 ? (
          <div className="empty-state">
            <p>No auto-reply rules yet. Create one to automate responses!</p>
          </div>
        ) : (
          rules.map(rule => (
            <div key={rule._id} className={`rule-card ${rule.isActive ? 'active' : 'inactive'}`}>
              <div className="rule-header">
                <h3>{rule.name}</h3>
                <span className="badge">{rule.triggerType}</span>
              </div>
              <div className="rule-details">
                <p><strong>Description:</strong> {rule.description || 'N/A'}</p>
                {rule.keywords?.length > 0 && (
                  <p><strong>Keywords:</strong> {rule.keywords.join(', ')}</p>
                )}
                <p><strong>Response:</strong> {rule.responseMessage}</p>
              </div>
              <div className="rule-actions">
                <button className="btn-secondary" onClick={() => handleEdit(rule)}>
                  <Edit2 size={16} /> Edit
                </button>
                <button className="btn-info" onClick={() => setTestingRuleId(rule._id)}>
                  <TestTube size={16} /> Test
                </button>
                <button className="btn-danger" onClick={() => handleDelete(rule._id)}>
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => !editingRule && resetForm()}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editingRule ? 'Edit Rule' : 'Create Auto-Reply Rule'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Device *</label>
                <select value={formData.deviceId} onChange={e => setFormData({ ...formData, deviceId: e.target.value })} required>
                  <option value="">Select device...</option>
                  {connectedDevices.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Rule Name *</label>
                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Trigger Type *</label>
                <select value={formData.triggerType} onChange={e => setFormData({ ...formData, triggerType: e.target.value })} required>
                  <option value="keyword">Keyword Match</option>
                  <option value="regex">Regex Pattern</option>
                  <option value="always">Always</option>
                </select>
              </div>
              {formData.triggerType === 'keyword' && (
                <div className="form-group">
                  <label>Keywords (comma-separated)</label>
                  <input type="text" value={formData.keywords} onChange={e => setFormData({ ...formData, keywords: e.target.value })} placeholder="hello, hi, hey" />
                </div>
              )}
              <div className="form-group">
                <label>Response Message *</label>
                <textarea value={formData.responseMessage} onChange={e => setFormData({ ...formData, responseMessage: e.target.value })} rows="4" required />
              </div>
              <div className="form-group">
                <label><input type="checkbox" checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} /> Active</label>
              </div>
              <div className="modal-buttons">
                <button type="submit" className="btn-primary">{editingRule ? 'Update' : 'Create'}</button>
                <button type="button" className="btn-secondary" onClick={resetForm}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {testingRuleId && (
        <div className="modal-overlay" onClick={() => setTestingRuleId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Test Rule</h2>
            <textarea value={testMessage} onChange={e => setTestMessage(e.target.value)} placeholder="Enter test message" rows="4" />
            {testResult && <div className="test-result"><p>{testResult.message}</p></div>}
            <div className="modal-buttons">
              <button className="btn-primary" onClick={handleTest}>Test</button>
              <button className="btn-secondary" onClick={() => setTestingRuleId(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AutoReplyPage;
