import React, { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';

const CODE_EXAMPLES = {
  send: `curl -X POST https://your-domain.com/api/messages/send \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "deviceId": "DEVICE_ID",
    "to": "1234567890",
    "message": "Hello from the API!"
  }'`,
  bulk: `curl -X POST https://your-domain.com/api/messages/bulk/upload \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "file=@contacts.xlsx" \\
  -F "deviceId=DEVICE_ID" \\
  -F "message=Hello {name}!"`,
  status: `curl https://your-domain.com/api/devices \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
};

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button className="sa-btn sa-btn-ghost sa-btn-sm" onClick={handleCopy} style={{ flexShrink: 0 }}>
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

export default function SuperAdminAPIKeys() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generatingId, setGeneratingId] = useState(null);
  const [newKey, setNewKey] = useState({ companyId: null, key: '' });
  const [activeExample, setActiveExample] = useState('send');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      // Fetch all companies (up to 200) so we can show both with and without keys
      const res = await api.get('/admin/companies', { params: { limit: 200 } });
      setCompanies(res.data.companies || []);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleGenerate = async (companyId, companyName) => {
    if (!window.confirm(`Generate a new API key for "${companyName}"? The existing key will be revoked.`)) return;
    try {
      setGeneratingId(companyId);
      const res = await api.post(`/admin/companies/${companyId}/api-key`);
      setNewKey({ companyId, key: res.data.apiKey });
      load();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to generate key');
    } finally {
      setGeneratingId(null);
    }
  };

  const handleRevoke = async (companyId, companyName) => {
    if (!window.confirm(`Revoke API key for "${companyName}"? This will immediately break any integrations using this key.`)) return;
    try {
      await api.delete(`/admin/api-keys/${companyId}`);
      if (newKey.companyId === companyId) setNewKey({ companyId: null, key: '' });
      load();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to revoke key');
    }
  };

  const withKeys = companies.filter(c => c.apiKey);
  const withoutKeys = companies.filter(c => !c.apiKey);

  return (
    <>
      <div className="sa-page-header">
        <div>
          <div className="sa-page-title">API Keys</div>
          <div className="sa-page-subtitle">{withKeys.length} companies with API access</div>
        </div>
      </div>

      {error && <div className="sa-alert sa-alert-error">{error}</div>}

      {/* New key banner */}
      {newKey.key && (
        <div className="sa-alert sa-alert-success" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>New API Key Generated</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
            <code style={{
              flex: 1, background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: 6,
              fontSize: 13, fontFamily: 'monospace', wordBreak: 'break-all'
            }}>
              {newKey.key}
            </code>
            <CopyButton text={newKey.key} />
          </div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            This key will not be shown again. Store it securely.
          </div>
          <button className="sa-btn sa-btn-ghost sa-btn-sm" onClick={() => setNewKey({ companyId: null, key: '' })}>
            Dismiss
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="sa-kpi-grid" style={{ marginBottom: 20 }}>
        <div className="sa-kpi green">
          <div className="sa-kpi-label">API Enabled</div>
          <div className="sa-kpi-value">{withKeys.length}</div>
          <div className="sa-kpi-sub">companies with active keys</div>
        </div>
        <div className="sa-kpi blue">
          <div className="sa-kpi-label">No API Key</div>
          <div className="sa-kpi-value">{withoutKeys.length}</div>
          <div className="sa-kpi-sub">companies without access</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Companies with keys */}
        <div className="sa-card">
          <div className="sa-card-header">
            <div className="sa-card-title">Companies with API Access</div>
          </div>
          {loading ? (
            <div className="sa-loading"><div className="sa-spinner" /><span>Loading…</span></div>
          ) : withKeys.length === 0 ? (
            <div className="sa-empty">
              <div className="sa-empty-title">No API keys yet</div>
              <div className="sa-empty-desc">Generate keys for companies below</div>
            </div>
          ) : (
            <div className="sa-table-wrap">
              <table className="sa-table">
                <thead>
                  <tr><th>Company</th><th>Key Preview</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {withKeys.map(c => (
                    <tr key={c._id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{c.companyName || c.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--sa-text-muted)' }}>{c.email}</div>
                      </td>
                      <td>
                        <code style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--sa-text-muted)' }}>
                          {c.apiKey.slice(0, 8)}…{c.apiKey.slice(-4)}
                        </code>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="sa-btn sa-btn-secondary sa-btn-sm"
                            onClick={() => handleGenerate(c._id, c.companyName || c.name)}
                            disabled={generatingId === c._id}
                          >
                            Rotate
                          </button>
                          <button
                            className="sa-btn sa-btn-danger sa-btn-sm"
                            onClick={() => handleRevoke(c._id, c.companyName || c.name)}
                          >
                            Revoke
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Companies without keys */}
        <div className="sa-card">
          <div className="sa-card-header">
            <div className="sa-card-title">Generate API Access</div>
            <div className="sa-card-subtitle">Companies without API keys</div>
          </div>
          {loading ? (
            <div className="sa-loading"><div className="sa-spinner" /><span>Loading…</span></div>
          ) : withoutKeys.length === 0 ? (
            <div className="sa-empty">
              <div className="sa-empty-title">All companies have keys</div>
            </div>
          ) : (
            <div className="sa-table-wrap">
              <table className="sa-table">
                <thead>
                  <tr><th>Company</th><th>Plan</th><th></th></tr>
                </thead>
                <tbody>
                  {withoutKeys.map(c => (
                    <tr key={c._id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{c.companyName || c.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--sa-text-muted)' }}>{c.email}</div>
                      </td>
                      <td>
                        <span className="sa-badge issued">{c.subscriptionPlan?.name || '—'}</span>
                      </td>
                      <td>
                        <button
                          className="sa-btn sa-btn-primary sa-btn-sm"
                          onClick={() => handleGenerate(c._id, c.companyName || c.name)}
                          disabled={generatingId === c._id}
                        >
                          {generatingId === c._id ? '…' : 'Generate Key'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* API Documentation */}
      <div className="sa-card" style={{ marginTop: 16 }}>
        <div className="sa-card-header">
          <div>
            <div className="sa-card-title">API Documentation</div>
            <div className="sa-card-subtitle">Quick reference for external integrations</div>
          </div>
        </div>
        <div className="sa-card-body">
          <div style={{ marginBottom: 16 }}>
            <div className="sa-label" style={{ marginBottom: 8 }}>Authentication</div>
            <p style={{ fontSize: 13, color: 'var(--sa-text-muted)', marginBottom: 10 }}>
              All API requests require an <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 4 }}>Authorization: Bearer YOUR_API_KEY</code> header.
            </p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div className="sa-label" style={{ marginBottom: 10 }}>Code Examples</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {[
                { key: 'send', label: 'Send Message' },
                { key: 'bulk', label: 'Bulk Upload' },
                { key: 'status', label: 'List Devices' },
              ].map(ex => (
                <button
                  key={ex.key}
                  className={`sa-btn sa-btn-sm ${activeExample === ex.key ? 'sa-btn-primary' : 'sa-btn-secondary'}`}
                  onClick={() => setActiveExample(ex.key)}
                >
                  {ex.label}
                </button>
              ))}
            </div>
            <div style={{ position: 'relative' }}>
              <pre style={{
                background: 'rgba(0,0,0,0.4)', border: '1px solid var(--sa-card-border)',
                borderRadius: 10, padding: '16px 20px', fontSize: 12, fontFamily: 'monospace',
                color: 'var(--sa-text)', overflow: 'auto', margin: 0, lineHeight: 1.7
              }}>
                {CODE_EXAMPLES[activeExample]}
              </pre>
              <div style={{ position: 'absolute', top: 10, right: 10 }}>
                <CopyButton text={CODE_EXAMPLES[activeExample]} />
              </div>
            </div>
          </div>

          {/* Endpoint reference */}
          <div>
            <div className="sa-label" style={{ marginBottom: 10 }}>Available Endpoints</div>
            <div className="sa-table-wrap">
              <table className="sa-table">
                <thead>
                  <tr><th>Method</th><th>Endpoint</th><th>Description</th></tr>
                </thead>
                <tbody>
                  {[
                    ['GET', '/api/devices', 'List connected WhatsApp devices'],
                    ['POST', '/api/messages/send', 'Send a single WhatsApp message'],
                    ['POST', '/api/messages/bulk/upload', 'Upload Excel for bulk messaging'],
                    ['GET', '/api/messages/bulk/jobs', 'List bulk message jobs'],
                    ['GET', '/api/chats', 'List all chats/conversations'],
                    ['GET', '/api/chats/:id/messages', 'Get messages in a chat'],
                    ['POST', '/api/chats/:id/messages', 'Reply to a chat'],
                    ['GET', '/api/subscriptions/current', 'Get current subscription info'],
                    ['GET', '/api/invoices', 'List invoices'],
                  ].map(([method, path, desc]) => (
                    <tr key={path}>
                      <td>
                        <span style={{
                          padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, fontFamily: 'monospace',
                          background: method === 'GET' ? 'rgba(88,166,255,0.1)' : 'rgba(37,211,102,0.1)',
                          color: method === 'GET' ? 'var(--sa-info)' : 'var(--sa-accent)',
                        }}>
                          {method}
                        </span>
                      </td>
                      <td>
                        <code style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--sa-text-muted)' }}>{path}</code>
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--sa-text-muted)' }}>{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
