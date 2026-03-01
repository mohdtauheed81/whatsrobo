import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser } from '../redux/authSlice';
import { Mail, Lock, Loader, AlertCircle, Info, ShieldCheck, Zap, Users } from 'lucide-react';
import '../styles/auth.css';

function LoginPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading, error } = useSelector(state => state.auth);

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [validationErrors, setValidationErrors] = useState({});

  const validate = () => {
    const errors = {};
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email address is invalid';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear validation error on change
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const result = await dispatch(loginUser(formData));
    if (result.meta.requestStatus === 'fulfilled') {
      navigate('/dashboard'); // Redux Slice combined with App router will push Super Admins to /superadmin
    }
  };

  const fillDemo = (role) => {
    if (role === 'admin') {
      setFormData({ email: 'admin@saaswhatsapp.com', password: 'AdminPassword123!' });
    } else {
      setFormData({ email: 'user@demo.com', password: 'UserPassword123!' });
    }
    setValidationErrors({});
  };

  return (
    <div className="auth-page-container">
      {/* Left Sidebar Info Area */}
      <div className="auth-sidebar">
        <div className="auth-sidebar-content">
          <h2>Welcome Back to SaaSWhatsApp</h2>
          <p>The premier multi-tenant platform for managing your WhatsApp Business API at scale.</p>

          <div className="auth-features">
            <div className="auth-feature-item">
              <div className="auth-feature-icon"><Zap size={20} /></div>
              <span>Lightning Fast Message Delivery</span>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-icon"><ShieldCheck size={20} /></div>
              <span>End-to-End Enterprise Security</span>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-icon"><Users size={20} /></div>
              <span>Ultimate Multi-Tenant Admin</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Login Area */}
      <div className="auth-main">
        <div className="auth-box">
          <div className="auth-header">
            <div className="auth-logo">
              <span style={{ color: '#25d366' }}><svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="css-i6dzq1"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg></span>
              SaaSWhatsApp
            </div>
            <h1>Sign in to your account</h1>
            <p>Welcome back! Please enter your details.</p>
          </div>

          {error && (
            <div className="auth-global-error">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email address</label>
              <div className={`input-wrapper ${validationErrors.email ? 'has-error' : ''}`}>
                <Mail size={18} className="input-icon" />
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                />
              </div>
              {validationErrors.email && (
                <div className="validation-error">
                  <AlertCircle size={14} /> {validationErrors.email}
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className={`input-wrapper ${validationErrors.password ? 'has-error' : ''}`}>
                <Lock size={18} className="input-icon" />
                <input
                  id="password"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                />
              </div>
              {validationErrors.password && (
                <div className="validation-error">
                  <AlertCircle size={14} /> {validationErrors.password}
                </div>
              )}
            </div>

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? (
                <>
                  <Loader size={20} className="spinner" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <div className="auth-footer">
            Don't have an account? <Link to="/register">Create one now</Link>
          </div>

          {/* Demo Credentials Box */}
          <div className="demo-credentials">
            <div className="demo-credentials-title">
              <Info size={18} color="#0284c7" />
              Demo Testing Accounts
            </div>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>
              Both normal users and Super Admins login through this identical portal. The system securely redirects you automatically based on your role.
            </p>

            <div className="demo-account">
              <div>
                <span className="role">Super Admin Demo</span>
                <span className="creds">admin@saaswhatsapp.com</span>
              </div>
              <button className="demo-fill-btn" type="button" onClick={() => fillDemo('admin')}>
                Fill Admin
              </button>
            </div>

            <div className="demo-account">
              <div>
                <span className="role">Normal User Demo</span>
                <span className="creds">user@demo.com</span>
              </div>
              <button className="demo-fill-btn" type="button" onClick={() => fillDemo('user')}>
                Fill User
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default LoginPage;
