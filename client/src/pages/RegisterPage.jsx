import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { registerUser } from '../redux/authSlice';
import { Building2, Mail, Lock, Phone, Loader, AlertCircle, Zap, ShieldCheck, Users } from 'lucide-react';
import '../styles/auth.css';

function RegisterPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading, error } = useSelector(state => state.auth);

  const [formData, setFormData] = useState({
    companyName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
  });

  const [validationErrors, setValidationErrors] = useState({});

  const validate = () => {
    const errors = {};
    if (!formData.companyName.trim()) {
      errors.companyName = 'Company name is required';
    } else if (formData.companyName.length < 3) {
      errors.companyName = 'Company length must be at least 3 chars';
    }

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

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const result = await dispatch(registerUser(formData));
    if (result.meta.requestStatus === 'fulfilled') {
      navigate('/dashboard');
    }
  };

  return (
    <div className="auth-page-container">
      {/* Left Sidebar Info Area */}
      <div className="auth-sidebar">
        <div className="auth-sidebar-content">
          <h2>Join SaaSWhatsApp Today</h2>
          <p>Supercharge your business communications and reach millions of customers in seconds.</p>

          <div className="auth-features">
            <div className="auth-feature-item">
              <div className="auth-feature-icon"><Zap size={20} /></div>
              <span>Connect Unlimited Devices</span>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-icon"><ShieldCheck size={20} /></div>
              <span>Anti-Ban Algorithms</span>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-icon"><Users size={20} /></div>
              <span>Scale your Audience Globally</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Register Area */}
      <div className="auth-main">
        <div className="auth-box">
          <div className="auth-header" style={{ marginBottom: '1.5rem' }}>
            <div className="auth-logo">
              <span style={{ color: '#25d366' }}><svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="css-i6dzq1"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg></span>
              SaaSWhatsApp
            </div>
            <h1>Create your account</h1>
            <p>Start your 14-day free trial. No credit card required.</p>
          </div>

          {error && (
            <div className="auth-global-error">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="companyName">Company Name</label>
              <div className={`input-wrapper ${validationErrors.companyName ? 'has-error' : ''}`}>
                <Building2 size={18} className="input-icon" />
                <input
                  id="companyName"
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  placeholder="e.g. Acme Corporation"
                />
              </div>
              {validationErrors.companyName && (
                <div className="validation-error">
                  <AlertCircle size={14} /> {validationErrors.companyName}
                </div>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="email">Work Email</label>
                <div className={`input-wrapper ${validationErrors.email ? 'has-error' : ''}`}>
                  <Mail size={18} className="input-icon" />
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="name@company.com"
                  />
                </div>
                {validationErrors.email && (
                  <div className="validation-error">
                    <AlertCircle size={14} /> {validationErrors.email}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="phoneNumber">Phone Number (Optional)</label>
                <div className="input-wrapper">
                  <Phone size={18} className="input-icon" />
                  <input
                    id="phoneNumber"
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>
            </div>

            <div className="form-row">
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
                    placeholder="Create a password"
                  />
                </div>
                {validationErrors.password && (
                  <div className="validation-error">
                    <AlertCircle size={14} /> {validationErrors.password}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <div className={`input-wrapper ${validationErrors.confirmPassword ? 'has-error' : ''}`}>
                  <Lock size={18} className="input-icon" />
                  <input
                    id="confirmPassword"
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm password"
                  />
                </div>
                {validationErrors.confirmPassword && (
                  <div className="validation-error">
                    <AlertCircle size={14} /> {validationErrors.confirmPassword}
                  </div>
                )}
              </div>
            </div>

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? (
                <>
                  <Loader size={20} className="spinner" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="auth-footer" style={{ marginTop: '1.5rem' }}>
            <p>Already have an account? <Link to="/login">Sign in here</Link></p>
            <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#94a3b8' }}>
              By creating an account, you agree to our Terms of Service & Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
