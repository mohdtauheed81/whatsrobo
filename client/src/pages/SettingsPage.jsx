import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { checkAuth } from '../redux/authSlice';
import api from '../services/api';
import { User, Lock, Key, Shield, Save, Eye, EyeOff, Copy, RefreshCw } from 'lucide-react';
import '../styles/settings.css';

const TABS = [
  { key: 'profile',  label: 'Profile',   Icon: User   },
  { key: 'password', label: 'Password',  Icon: Lock   },
  { key: 'api',      label: 'API Key',   Icon: Key    },
  { key: 'privacy',  label: 'Privacy',   Icon: Shield },
];

export default function SettingsPage() {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const [tab, setTab] = useState('profile');

  // ─── Profile state ────────────────────────────────────────────────────────
  const [profile, setProfile] = useState({ companyName: '', email: '', phoneNumber: '', website: '', country: '', address: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);

  // ─── Password state ───────────────────────────────────────────────────────
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);

  // ─── API Key state ────────────────────────────────────────────────────────
  const [apiKey, setApiKey] = useState('');
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const [apiKeyGenerating, setApiKeyGenerating] = useState(false);
  const [apiMsg, setApiMsg] = useState(null);

  // ─── Error state ──────────────────────────────────────────────────────────
  const [error, setError] = useState(null);

  // Load profile on mount
  useEffect(() => {
    api.get('/auth/profile').then(res => {
      const c = res.data.company;
      setProfile({
        companyName: c.companyName || '',
        email: c.email || '',
        phoneNumber: c.phoneNumber || '',
        website: c.website || '',
        country: c.country || '',
        address: c.address || '',
      });
      setApiKey(c.apiKey || '');
    }).catch(() => setError('Failed to load profile'));
  }, []);

  const flash = (setter, msg, isError = false) => {
    setter({ text: msg, isError });
    setTimeout(() => setter(null), 4000);
  };

  // ─── Save Profile ─────────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    setError(null);
    setProfileSaving(true);
    try {
      await api.put('/auth/profile', {
        companyName: profile.companyName,
        phoneNumber: profile.phoneNumber,
        website: profile.website,
        country: profile.country,
        address: profile.address,
      });
      dispatch(checkAuth()); // refresh redux user state
      flash(setProfileMsg, 'Profile updated successfully');
    } catch (e) {
      flash(setProfileMsg, e.response?.data?.error || 'Failed to update profile', true);
    } finally {
      setProfileSaving(false);
    }
  };

  // ─── Change Password ──────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    setError(null);
    if (!passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword) {
      return flash(setPwMsg, 'All password fields are required', true);
    }
    if (passwords.newPassword.length < 6) {
      return flash(setPwMsg, 'New password must be at least 6 characters', true);
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      return flash(setPwMsg, 'New passwords do not match', true);
    }
    setPwSaving(true);
    try {
      await api.put('/auth/profile', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      flash(setPwMsg, 'Password changed successfully');
    } catch (e) {
      flash(setPwMsg, e.response?.data?.error || 'Failed to change password', true);
    } finally {
      setPwSaving(false);
    }
  };

  // ─── Generate API Key ─────────────────────────────────────────────────────
  const handleGenerateApiKey = async () => {
    if (!window.confirm('This will invalidate your current API key. Continue?')) return;
    setApiKeyGenerating(true);
    try {
      const res = await api.post('/auth/api-key');
      setApiKey(res.data.apiKey);
      flash(setApiMsg, 'New API key generated');
    } catch (e) {
      flash(setApiMsg, e.response?.data?.error || 'Failed to generate API key', true);
    } finally {
      setApiKeyGenerating(false);
    }
  };

  const handleCopyApiKey = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey).then(() => {
      setApiKeyCopied(true);
      setTimeout(() => setApiKeyCopied(false), 2000);
    });
  };

  // ─── GDPR Export ─────────────────────────────────────────────────────────
  const handleExportData = async () => {
    try {
      const res = await api.get('/gdpr/export', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'my-data-export.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Failed to export data');
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  const renderTab = () => {
    switch (tab) {
      case 'profile':
        return (
          <div className="settings-section">
            <div className="settings-section-title">Account Information</div>
            {profileMsg && (
              <div className={`settings-alert ${profileMsg.isError ? 'settings-alert-error' : 'settings-alert-success'}`}>
                {profileMsg.text}
              </div>
            )}
            <div className="settings-form-row">
              <div className="settings-field">
                <label>Company Name</label>
                <input value={profile.companyName} onChange={e => setProfile(p => ({ ...p, companyName: e.target.value }))} placeholder="Acme Corp" />
              </div>
              <div className="settings-field">
                <label>Email Address</label>
                <input value={profile.email} disabled title="Email cannot be changed" />
              </div>
            </div>
            <div className="settings-form-row">
              <div className="settings-field">
                <label>Phone Number</label>
                <input value={profile.phoneNumber} onChange={e => setProfile(p => ({ ...p, phoneNumber: e.target.value }))} placeholder="+1 234 567 8900" />
              </div>
              <div className="settings-field">
                <label>Website</label>
                <input value={profile.website} onChange={e => setProfile(p => ({ ...p, website: e.target.value }))} placeholder="https://your-company.com" />
              </div>
            </div>
            <div className="settings-form-row">
              <div className="settings-field">
                <label>Country</label>
                <input value={profile.country} onChange={e => setProfile(p => ({ ...p, country: e.target.value }))} placeholder="United States" />
              </div>
              <div className="settings-field">
                <label>Address</label>
                <input value={profile.address} onChange={e => setProfile(p => ({ ...p, address: e.target.value }))} placeholder="123 Main St, City" />
              </div>
            </div>
            <button className="settings-btn settings-btn-primary" onClick={handleSaveProfile} disabled={profileSaving}>
              <Save size={16} />
              {profileSaving ? 'Saving…' : 'Save Profile'}
            </button>
          </div>
        );

      case 'password':
        return (
          <div className="settings-section">
            <div className="settings-section-title">Change Password</div>
            {pwMsg && (
              <div className={`settings-alert ${pwMsg.isError ? 'settings-alert-error' : 'settings-alert-success'}`}>
                {pwMsg.text}
              </div>
            )}
            {['current', 'new', 'confirm'].map(field => {
              const labels = { current: 'Current Password', new: 'New Password', confirm: 'Confirm New Password' };
              const keys = { current: 'currentPassword', new: 'newPassword', confirm: 'confirmPassword' };
              return (
                <div className="settings-field" key={field}>
                  <label>{labels[field]}</label>
                  <div className="settings-pw-wrap">
                    <input
                      type={showPw[field] ? 'text' : 'password'}
                      value={passwords[keys[field]]}
                      onChange={e => setPasswords(p => ({ ...p, [keys[field]]: e.target.value }))}
                      placeholder={labels[field]}
                    />
                    <button className="settings-pw-eye" onClick={() => setShowPw(s => ({ ...s, [field]: !s[field] }))}>
                      {showPw[field] ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              );
            })}
            <button className="settings-btn settings-btn-primary" onClick={handleChangePassword} disabled={pwSaving}>
              <Lock size={16} />
              {pwSaving ? 'Changing…' : 'Change Password'}
            </button>
          </div>
        );

      case 'api':
        return (
          <div className="settings-section">
            <div className="settings-section-title">API Key</div>
            <p className="settings-hint">Use this key to authenticate API requests. Keep it secret.</p>
            {apiMsg && (
              <div className={`settings-alert ${apiMsg.isError ? 'settings-alert-error' : 'settings-alert-success'}`}>
                {apiMsg.text}
              </div>
            )}
            <div className="settings-field">
              <label>Your API Key</label>
              <div className="settings-api-row">
                <input
                  value={apiKey || 'No API key generated yet'}
                  readOnly
                  className="settings-api-input"
                  style={{ fontFamily: 'monospace', fontSize: 13 }}
                />
                <button className="settings-btn settings-btn-secondary" onClick={handleCopyApiKey} disabled={!apiKey}>
                  <Copy size={15} />
                  {apiKeyCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            <button className="settings-btn settings-btn-danger" onClick={handleGenerateApiKey} disabled={apiKeyGenerating}>
              <RefreshCw size={16} className={apiKeyGenerating ? 'spin' : ''} />
              {apiKeyGenerating ? 'Generating…' : apiKey ? 'Regenerate API Key' : 'Generate API Key'}
            </button>
            <div className="settings-hint" style={{ marginTop: 16 }}>
              Include in requests as: <code>Authorization: Bearer YOUR_API_KEY</code>
            </div>
          </div>
        );

      case 'privacy':
        return (
          <div className="settings-section">
            <div className="settings-section-title">Privacy & Data</div>
            <p className="settings-hint">Under GDPR you have the right to access and delete your personal data.</p>

            <div className="settings-privacy-card">
              <div className="settings-privacy-info">
                <div className="settings-privacy-label">Export Your Data</div>
                <div className="settings-privacy-desc">Download a JSON file containing all data we hold about your account (messages, devices, chats, invoices).</div>
              </div>
              <button className="settings-btn settings-btn-secondary" onClick={handleExportData}>
                Export Data
              </button>
            </div>

            <div className="settings-privacy-card settings-privacy-card-danger">
              <div className="settings-privacy-info">
                <div className="settings-privacy-label">Delete Account</div>
                <div className="settings-privacy-desc">Permanently delete all your data. This is irreversible. Invoices are retained for 7 years for legal compliance.</div>
              </div>
              <button
                className="settings-btn settings-btn-danger"
                onClick={() => {
                  const pw = window.prompt('Enter your password to confirm account deletion:');
                  if (!pw) return;
                  if (!window.confirm('This will permanently delete all your data. Are you absolutely sure?')) return;
                  api.delete('/gdpr/delete', { data: { confirmPassword: pw } })
                    .then(() => {
                      alert('Your data has been deleted. You will be logged out.');
                      window.location.href = '/login';
                    })
                    .catch(e => alert(e.response?.data?.error || 'Failed to delete account'));
                }}
              >
                Delete My Account
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h2>Settings</h2>
        <p>Manage your account, security, and privacy preferences</p>
      </div>

      {error && <div className="settings-alert settings-alert-error">{error}</div>}

      <div className="settings-layout">
        {/* Tab nav */}
        <div className="settings-tabs">
          {TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              className={`settings-tab ${tab === key ? 'active' : ''}`}
              onClick={() => setTab(key)}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="settings-content-panel">
          {renderTab()}
        </div>
      </div>
    </div>
  );
}
