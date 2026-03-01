import React, { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';

const SECTIONS = [
  { key: 'general', label: 'General', icon: '⚙️' },
  { key: 'payment', label: 'Payment Gateway', icon: '💳' },
  { key: 'smtp', label: 'SMTP / Email', icon: '📧' },
  { key: 'limits', label: 'Platform Limits', icon: '📊' },
  { key: 'api', label: 'API Config', icon: '🔗' },
];

function Toggle({ label, desc, checked, onChange }) {
  return (
    <div className="sa-toggle-wrap">
      <div>
        <div className="sa-toggle-label">{label}</div>
        {desc && <div className="sa-toggle-desc">{desc}</div>}
      </div>
      <label className="sa-toggle">
        <input type="checkbox" checked={!!checked} onChange={e => onChange(e.target.checked)} />
        <span className="sa-toggle-slider" />
      </label>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div className="sa-form-group">
      <label className="sa-label">{label}</label>
      {children}
      {hint && <div className="sa-form-hint">{hint}</div>}
    </div>
  );
}

export default function SuperAdminSettings() {
  const [activeSection, setActiveSection] = useState('general');
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/admin/settings');
      // Flatten nested settings object
      const flat = {};
      Object.values(res.data.settings || {}).forEach(catSettings => {
        Object.assign(flat, catSettings);
      });
      setSettings(flat);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (key, value) => setSettings(s => ({ ...s, [key]: value }));

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      // Build settings payload grouped by section
      const categoryMap = {
        general: ['platformName', 'platformUrl', 'supportEmail', 'maintenanceMode', 'registrationEnabled'],
        payment: ['stripePublicKey', 'stripeSecretKey', 'stripeWebhookSecret', 'paypalClientId', 'paypalSecret', 'paymentMode', 'currency', 'taxRate', 'bankTransferEnabled', 'bankTransferDetails'],
        smtp: ['smtpHost', 'smtpPort', 'smtpUser', 'smtpPass', 'smtpFrom', 'smtpSecure'],
        limits: ['defaultMaxDevices', 'defaultMaxMessages', 'globalMessageDelay', 'messagesPerMinute', 'maxBulkContacts', 'sessionTimeout'],
        api: ['apiRateLimit', 'apiWhitelist', 'webhookTimeout', 'jwtExpiry'],
      };

      const toSave = {};
      Object.entries(categoryMap).forEach(([cat, keys]) => {
        keys.forEach(k => {
          if (settings[k] !== undefined) {
            if (!toSave[cat]) toSave[cat] = {};
            toSave[cat][k] = settings[k];
          }
        });
      });

      await api.put('/admin/settings', { settings: toSave });
      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'general':
        return (
          <div>
            <Field label="Platform Name" hint="Shown in emails and the UI">
              <input className="sa-input" value={settings.platformName || ''} onChange={e => set('platformName', e.target.value)} placeholder="WA SaaS Platform" />
            </Field>
            <Field label="Platform URL" hint="Your production domain">
              <input className="sa-input" value={settings.platformUrl || ''} onChange={e => set('platformUrl', e.target.value)} placeholder="https://your-domain.com" />
            </Field>
            <Field label="Support Email">
              <input className="sa-input" type="email" value={settings.supportEmail || ''} onChange={e => set('supportEmail', e.target.value)} placeholder="support@your-domain.com" />
            </Field>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
              <Toggle
                label="Maintenance Mode"
                desc="When enabled, users see a maintenance page instead of the dashboard"
                checked={settings.maintenanceMode}
                onChange={v => set('maintenanceMode', v)}
              />
              <Toggle
                label="Open Registration"
                desc="Allow new companies to self-register via the registration page"
                checked={settings.registrationEnabled !== false}
                onChange={v => set('registrationEnabled', v)}
              />
            </div>
          </div>
        );

      case 'payment':
        return (
          <div>
            <div style={{ marginBottom: 20, padding: '12px 16px', background: 'rgba(88,166,255,0.06)', border: '1px solid rgba(88,166,255,0.15)', borderRadius: 8, fontSize: 13, color: 'var(--sa-info)' }}>
              🔒 Secret keys are stored encrypted. Leave blank to keep the existing value.
            </div>
            <div className="sa-form-row">
              <Field label="Currency" hint="e.g. USD, EUR, GBP">
                <input className="sa-input" value={settings.currency || ''} onChange={e => set('currency', e.target.value)} placeholder="USD" />
              </Field>
              <Field label="Tax Rate (%)" hint="Applied to new invoices">
                <input className="sa-input" type="number" min="0" max="100" value={settings.taxRate || ''} onChange={e => set('taxRate', e.target.value)} placeholder="18" />
              </Field>
            </div>
            <Field label="Payment Mode">
              <select className="sa-select" value={settings.paymentMode || 'test'} onChange={e => set('paymentMode', e.target.value)}>
                <option value="test">Test Mode</option>
                <option value="live">Live Mode</option>
              </select>
            </Field>

            <div style={{ borderTop: '1px solid var(--sa-card-border)', margin: '20px 0', paddingTop: 20 }}>
              <div className="sa-card-title" style={{ marginBottom: 16 }}>Stripe</div>
              <Field label="Stripe Publishable Key">
                <input className="sa-input" value={settings.stripePublicKey || ''} onChange={e => set('stripePublicKey', e.target.value)} placeholder="pk_test_…" />
              </Field>
              <Field label="Stripe Secret Key" hint="Leave blank to keep existing">
                <input className="sa-input" type="password" value={settings.stripeSecretKey || ''} onChange={e => set('stripeSecretKey', e.target.value)} placeholder="sk_test_…" />
              </Field>
              <Field label="Stripe Webhook Secret" hint="From your Stripe dashboard webhooks">
                <input className="sa-input" type="password" value={settings.stripeWebhookSecret || ''} onChange={e => set('stripeWebhookSecret', e.target.value)} placeholder="whsec_…" />
              </Field>
            </div>

            <div style={{ borderTop: '1px solid var(--sa-card-border)', margin: '20px 0', paddingTop: 20 }}>
              <div className="sa-card-title" style={{ marginBottom: 16 }}>PayPal</div>
              <Field label="PayPal Client ID">
                <input className="sa-input" value={settings.paypalClientId || ''} onChange={e => set('paypalClientId', e.target.value)} placeholder="AeA…" />
              </Field>
              <Field label="PayPal Secret" hint="Leave blank to keep existing">
                <input className="sa-input" type="password" value={settings.paypalSecret || ''} onChange={e => set('paypalSecret', e.target.value)} placeholder="Secret" />
              </Field>
            </div>

            <div style={{ marginTop: 16 }}>
              <Toggle
                label="Bank Transfer Payments"
                desc="Allow companies to pay via bank transfer with manual confirmation"
                checked={settings.bankTransferEnabled}
                onChange={v => set('bankTransferEnabled', v)}
              />
              {settings.bankTransferEnabled && (
                <div className="sa-form-group" style={{ marginTop: 12 }}>
                  <label className="sa-label">Bank Transfer Instructions</label>
                  <textarea
                    className="sa-textarea"
                    rows={4}
                    value={settings.bankTransferDetails || ''}
                    onChange={e => set('bankTransferDetails', e.target.value)}
                    placeholder="Bank name: XYZ Bank&#10;Account: 1234567890&#10;Routing: 021000021"
                  />
                </div>
              )}
            </div>
          </div>
        );

      case 'smtp':
        return (
          <div>
            <div className="sa-form-row">
              <Field label="SMTP Host">
                <input className="sa-input" value={settings.smtpHost || ''} onChange={e => set('smtpHost', e.target.value)} placeholder="smtp.gmail.com" />
              </Field>
              <Field label="SMTP Port">
                <input className="sa-input" type="number" value={settings.smtpPort || ''} onChange={e => set('smtpPort', e.target.value)} placeholder="587" />
              </Field>
            </div>
            <div className="sa-form-row">
              <Field label="SMTP Username">
                <input className="sa-input" value={settings.smtpUser || ''} onChange={e => set('smtpUser', e.target.value)} placeholder="user@gmail.com" />
              </Field>
              <Field label="SMTP Password" hint="Leave blank to keep existing">
                <input className="sa-input" type="password" value={settings.smtpPass || ''} onChange={e => set('smtpPass', e.target.value)} placeholder="App password" />
              </Field>
            </div>
            <Field label="From Address" hint="The email address that appears as sender">
              <input className="sa-input" value={settings.smtpFrom || ''} onChange={e => set('smtpFrom', e.target.value)} placeholder='"WA SaaS" <noreply@your-domain.com>' />
            </Field>
            <Toggle
              label="TLS / Secure Connection"
              desc="Enable SSL/TLS encryption (use port 465 for SSL, 587 for STARTTLS)"
              checked={settings.smtpSecure}
              onChange={v => set('smtpSecure', v)}
            />
          </div>
        );

      case 'limits':
        return (
          <div>
            <div className="sa-form-row">
              <Field label="Default Max Devices" hint="Per company on new plan">
                <input className="sa-input" type="number" min="1" value={settings.defaultMaxDevices || ''} onChange={e => set('defaultMaxDevices', e.target.value)} placeholder="3" />
              </Field>
              <Field label="Default Max Messages/Month">
                <input className="sa-input" type="number" min="1" value={settings.defaultMaxMessages || ''} onChange={e => set('defaultMaxMessages', e.target.value)} placeholder="5000" />
              </Field>
            </div>
            <div className="sa-form-row">
              <Field label="Global Message Delay (ms)" hint="Minimum delay between any two messages">
                <input className="sa-input" type="number" min="500" value={settings.globalMessageDelay || ''} onChange={e => set('globalMessageDelay', e.target.value)} placeholder="1500" />
              </Field>
              <Field label="Messages Per Minute (per company)">
                <input className="sa-input" type="number" min="1" value={settings.messagesPerMinute || ''} onChange={e => set('messagesPerMinute', e.target.value)} placeholder="20" />
              </Field>
            </div>
            <div className="sa-form-row">
              <Field label="Max Bulk Contacts per Upload">
                <input className="sa-input" type="number" min="1" value={settings.maxBulkContacts || ''} onChange={e => set('maxBulkContacts', e.target.value)} placeholder="10000" />
              </Field>
              <Field label="Session Timeout (hours)">
                <input className="sa-input" type="number" min="1" value={settings.sessionTimeout || ''} onChange={e => set('sessionTimeout', e.target.value)} placeholder="24" />
              </Field>
            </div>
          </div>
        );

      case 'api':
        return (
          <div>
            <Field label="API Rate Limit (req/min)" hint="Per API key">
              <input className="sa-input" type="number" min="1" value={settings.apiRateLimit || ''} onChange={e => set('apiRateLimit', e.target.value)} placeholder="60" />
            </Field>
            <Field label="Webhook Timeout (ms)" hint="Maximum time to wait for webhook response">
              <input className="sa-input" type="number" min="1000" value={settings.webhookTimeout || ''} onChange={e => set('webhookTimeout', e.target.value)} placeholder="5000" />
            </Field>
            <Field label="JWT Expiry" hint="Token expiry (e.g. 7d, 24h, 30d)">
              <input className="sa-input" value={settings.jwtExpiry || ''} onChange={e => set('jwtExpiry', e.target.value)} placeholder="7d" />
            </Field>
            <Field label="IP Whitelist for Admin API" hint="Comma-separated IPs. Leave blank for no restriction.">
              <textarea
                className="sa-textarea"
                rows={3}
                value={settings.apiWhitelist || ''}
                onChange={e => set('apiWhitelist', e.target.value)}
                placeholder="192.168.1.1, 10.0.0.0/24"
              />
            </Field>

            {/* API Endpoint Docs */}
            <div style={{ marginTop: 24, padding: '16px 20px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--sa-card-border)', borderRadius: 10 }}>
              <div className="sa-card-title" style={{ marginBottom: 12 }}>Base API URL</div>
              <code style={{
                display: 'block', background: 'rgba(0,0,0,0.3)', padding: '10px 14px',
                borderRadius: 8, fontSize: 13, fontFamily: 'monospace', color: 'var(--sa-accent)',
                wordBreak: 'break-all'
              }}>
                {settings.platformUrl || 'https://your-domain.com'}/api
              </code>
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--sa-text-muted)' }}>
                Use Authorization: Bearer &lt;API_KEY&gt; header for all requests
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <div className="sa-page-header">
        <div>
          <div className="sa-page-title">Platform Settings</div>
          <div className="sa-page-subtitle">Configure payment gateways, SMTP, and platform behavior</div>
        </div>
        <button className="sa-btn sa-btn-primary" onClick={handleSave} disabled={saving || loading}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {success && <div className="sa-alert sa-alert-success">✓ {success}</div>}
      {error && <div className="sa-alert sa-alert-error">{error}</div>}

      {loading ? (
        <div className="sa-loading"><div className="sa-spinner" /><span>Loading settings…</span></div>
      ) : (
        <div className="sa-settings-layout">
          {/* Settings Nav */}
          <div className="sa-settings-nav">
            {SECTIONS.map(s => (
              <button
                key={s.key}
                className={`sa-settings-nav-item ${activeSection === s.key ? 'active' : ''}`}
                onClick={() => setActiveSection(s.key)}
              >
                <span>{s.icon}</span>
                {s.label}
              </button>
            ))}
          </div>

          {/* Settings Panel */}
          <div className="sa-card">
            <div className="sa-card-header">
              <div>
                <div className="sa-card-title">{SECTIONS.find(s => s.key === activeSection)?.label}</div>
              </div>
            </div>
            <div className="sa-card-body">
              {renderSection()}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
