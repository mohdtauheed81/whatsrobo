import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
    MessageSquare, Zap, Target, Users, CheckCircle,
    BarChart, Smartphone, Bot, Shield
} from 'lucide-react';
import '../styles/landing.css';

const LandingPage = () => {
    const { isAuthenticated } = useSelector(state => state.auth);

    return (
        <div className="landing-container">
            {/* Navigation */}
            <nav className="landing-navbar">
                <div className="landing-logo">
                    <MessageSquare size={28} color="#25d366" fill="#25d366" />
                    <span>SaaSWhatsApp</span>
                </div>

                <div className="landing-nav-links">
                    <a href="#features">Features</a>
                    <a href="#how-it-works">How It Works</a>
                    <a href="#pricing">Pricing</a>
                </div>

                <div className="landing-nav-actions">
                    {isAuthenticated ? (
                        <Link to="/dashboard" className="register-btn">Go to Dashboard</Link>
                    ) : (
                        <>
                            <Link to="/login" className="login-btn">Log In</Link>
                            <Link to="/register" className="register-btn">Get Started</Link>
                        </>
                    )}
                </div>
            </nav>

            {/* Hero Section */}
            <section className="hero-section">
                <div className="hero-bg-shape"></div>

                <div className="hero-content">
                    <h1 className="hero-title">
                        The Ultimate WhatsApp Business <br />
                        <span className="highlight">API Platform</span>
                    </h1>
                    <p className="hero-subtitle">
                        Scale your business communication with our multi-tenant WhatsApp API.
                        Automate customer support, send bulk marketing campaigns, and drive sales seamlessly.
                    </p>
                    <div className="hero-actions">
                        <Link to={isAuthenticated ? '/dashboard' : '/register'} className="btn-primary btn-large">
                            Start Free Trial
                        </Link>
                        <a href="#demo" className="btn-secondary btn-outline btn-large" style={{ textDecoration: 'none' }}>
                            Book a Demo
                        </a>
                    </div>
                    <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', color: '#64748b', fontSize: '0.9rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <CheckCircle size={16} color="#25d366" /> No Credit Card Required
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <CheckCircle size={16} color="#25d366" /> 14-Day Free Trial
                        </span>
                    </div>
                </div>

                <div className="hero-visual">
                    <div className="dashboard-mockup">
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: '700', color: '#1e293b' }}>Dashboard Analytics</div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }}></span>
                                <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b' }}></span>
                                <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#10b981' }}></span>
                            </div>
                        </div>
                        <div style={{ padding: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <div style={{ color: '#64748b', marginBottom: '0.5rem' }}>Messages Sent</div>
                                <div style={{ fontSize: '2rem', fontWeight: '800', color: '#075e54' }}>14,582</div>
                                <div style={{ color: '#25d366', fontSize: '0.875rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <TrendingUp size={14} /> +12.5% this week
                                </div>
                            </div>
                            <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <div style={{ color: '#64748b', marginBottom: '0.5rem' }}>Devices Active</div>
                                <div style={{ fontSize: '2rem', fontWeight: '800', color: '#075e54' }}>12/15</div>
                                <div style={{ color: '#25d366', fontSize: '0.875rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <CheckCircle size={14} /> All Connected
                                </div>
                            </div>
                            <div style={{ gridColumn: '1 / -1', background: '#f8fafc', height: '120px', borderRadius: '12px', border: '1px solid #e2e8f0', position: 'relative', overflow: 'hidden' }}>
                                <svg viewBox="0 0 100 30" width="100%" height="100%" preserveAspectRatio="none">
                                    <path d="M0,30 L0,20 C10,15 20,25 30,15 C40,5 50,20 60,10 C70,0 80,15 90,5 C100,-5 100,5 100,30 Z" fill="rgba(37,211,102,0.2)" />
                                    <path d="M0,20 C10,15 20,25 30,15 C40,5 50,20 60,10 C70,0 80,15 90,5 C100,-5 100,5 100,30" fill="none" stroke="#25d366" strokeWidth="2" />
                                </svg>
                            </div>
                        </div>

                        <div className="floating-card c1">
                            <Bot size={24} color="#075e54" />
                            <div>
                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Auto-Reply</div>
                                <div style={{ fontWeight: '600' }}>Active</div>
                            </div>
                        </div>
                        <div className="floating-card c2">
                            <Zap size={24} color="#f59e0b" />
                            <div>
                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Campaign</div>
                                <div style={{ fontWeight: '600' }}>Sent - 98% Open Rate</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="stats-section">
                <div className="stat-item">
                    <h3>10M+</h3>
                    <p>Messages Delivered</p>
                </div>
                <div className="stat-item">
                    <h3>99.9%</h3>
                    <p>Uptime SLA</p>
                </div>
                <div className="stat-item">
                    <h3>5k+</h3>
                    <p>Active Tenants</p>
                </div>
                <div className="stat-item">
                    <h3>24/7</h3>
                    <p>Expert Support</p>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="features-section">
                <div className="section-header">
                    <span className="section-tag">Powerful Features</span>
                    <h2 className="section-title">Everything you need to master WhatsApp Business</h2>
                </div>

                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-icon primary">
                            <Bot size={28} />
                        </div>
                        <h3 className="feature-title">Smart Auto-Replies</h3>
                        <p className="feature-desc">
                            Set up keyword-based automated responses. Engage customers instantly 24/7 without manual intervention.
                        </p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon secondary">
                            <Target size={28} />
                        </div>
                        <h3 className="feature-title">Targeted Bulk Messaging</h3>
                        <p className="feature-desc">
                            Upload Excel sheets and send personalized bulk messages. Advanced rate limiting prevents number bans.
                        </p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon accent">
                            <Users size={28} />
                        </div>
                        <h3 className="feature-title">Multi-Tenant Architecture</h3>
                        <p className="feature-desc">
                            Manage multiple companies, brands, or clients from a single ultimate super-admin dashboard.
                        </p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon warning">
                            <Smartphone size={28} />
                        </div>
                        <h3 className="feature-title">Multi-Device Support</h3>
                        <p className="feature-desc">
                            Connect multiple WhatsApp numbers simultaneously. Scale your support and marketing teams effortlessly.
                        </p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon primary">
                            <BarChart size={28} />
                        </div>
                        <h3 className="feature-title">Detailed Analytics</h3>
                        <p className="feature-desc">
                            Track message delivery, open rates, and read receipts. Optimize your campaigns with real-time data.
                        </p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon secondary">
                            <Shield size={28} />
                        </div>
                        <h3 className="feature-title">Bank-Grade Security</h3>
                        <p className="feature-desc">
                            End-to-end encrypted messaging, secure JWT authentication, and robust data isolation for all tenants.
                        </p>
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="pricing-section">
                <div className="section-header">
                    <span className="section-tag">Pricing</span>
                    <h2 className="section-title">Transparent pricing for teams of all sizes</h2>
                </div>

                <div className="pricing-grid">
                    {/* Starter Plan */}
                    <div className="pricing-card">
                        <h3 className="plan-name">Starter</h3>
                        <div className="plan-price">$29<span>/mo</span></div>
                        <ul className="plan-features">
                            <li><CheckCircle className="feature-check" size={20} /> 1 WhatsApp Device</li>
                            <li><CheckCircle className="feature-check" size={20} /> 5,000 Messages/mo</li>
                            <li><CheckCircle className="feature-check" size={20} /> Basic Auto-Replies</li>
                            <li><CheckCircle className="feature-check" size={20} /> Community Support</li>
                        </ul>
                        <Link to="/register" className="pricing-btn primary">Start Free Trial</Link>
                    </div>

                    {/* Pro Plan */}
                    <div className="pricing-card popular">
                        <div className="popular-badge">Most Popular</div>
                        <h3 className="plan-name">Professional</h3>
                        <div className="plan-price">$79<span>/mo</span></div>
                        <ul className="plan-features">
                            <li><CheckCircle className="feature-check" size={20} /> 5 WhatsApp Devices</li>
                            <li><CheckCircle className="feature-check" size={20} /> 50,000 Messages/mo</li>
                            <li><CheckCircle className="feature-check" size={20} /> Advanced Auto-Replies</li>
                            <li><CheckCircle className="feature-check" size={20} /> Bulk Messaging API</li>
                            <li><CheckCircle className="feature-check" size={20} /> Priority Support</li>
                        </ul>
                        <Link to="/register" className="pricing-btn popular-btn">Get Started</Link>
                    </div>

                    {/* Enterprise Plan */}
                    <div className="pricing-card">
                        <h3 className="plan-name">Enterprise</h3>
                        <div className="plan-price">$199<span>/mo</span></div>
                        <ul className="plan-features">
                            <li><CheckCircle className="feature-check" size={20} /> Unlimited Devices</li>
                            <li><CheckCircle className="feature-check" size={20} /> Unlimited Messages</li>
                            <li><CheckCircle className="feature-check" size={20} /> Custom Integrations</li>
                            <li><CheckCircle className="feature-check" size={20} /> Dedicated Account Manager</li>
                            <li><CheckCircle className="feature-check" size={20} /> SLA Guarantee</li>
                        </ul>
                        <Link to="/register" className="pricing-btn primary">Contact Sales</Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="footer">
                <div className="footer-grid">
                    <div className="footer-brand">
                        <div className="landing-logo">
                            <MessageSquare size={24} color="#25d366" fill="#25d366" />
                            <span style={{ color: 'white', background: 'none', WebkitTextFillColor: 'white' }}>SaaSWhatsApp</span>
                        </div>
                        <p>
                            Empowering businesses globally to connect with customers through the
                            most reliable WhatsApp API platform.
                        </p>
                    </div>

                    <div className="footer-links">
                        <h4>Product</h4>
                        <ul>
                            <li><a href="#features">Features</a></li>
                            <li><a href="#pricing">Pricing</a></li>
                            <li><a href="#">API Documentation</a></li>
                            <li><a href="#">Security</a></li>
                        </ul>
                    </div>

                    <div className="footer-links">
                        <h4>Company</h4>
                        <ul>
                            <li><a href="#">About Us</a></li>
                            <li><a href="#">Careers</a></li>
                            <li><a href="#">Blog</a></li>
                            <li><a href="#">Contact</a></li>
                        </ul>
                    </div>

                    <div className="footer-links">
                        <h4>Legal</h4>
                        <ul>
                            <li><a href="#">Terms of Service</a></li>
                            <li><a href="#">Privacy Policy</a></li>
                            <li><a href="#">Cookie Policy</a></li>
                            <li><a href="#">GDPR</a></li>
                        </ul>
                    </div>
                </div>
                <div className="footer-bottom">
                    &copy; {new Date().getFullYear()} SaaSWhatsApp. All rights reserved.
                </div>
            </footer>
        </div>
    );
};

// Mini Component for Dummy Chart SVG
const TrendingUp = ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
        <polyline points="17 6 23 6 23 12"></polyline>
    </svg>
);

export default LandingPage;
