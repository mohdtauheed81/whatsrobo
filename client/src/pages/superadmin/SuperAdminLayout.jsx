import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../redux/authSlice';
import '../../styles/superadmin.css';

const NAV = [
  {
    label: 'Overview',
    items: [
      { to: '/superadmin/dashboard', icon: '▦', label: 'Dashboard' },
    ],
  },
  {
    label: 'Management',
    items: [
      { to: '/superadmin/companies', icon: '🏢', label: 'Companies' },
      { to: '/superadmin/invoices', icon: '🧾', label: 'Invoices' },
      { to: '/superadmin/plans', icon: '💎', label: 'Plans' },
      { to: '/superadmin/api-keys', icon: '🔑', label: 'API Keys' },
    ],
  },
  {
    label: 'Configuration',
    items: [
      { to: '/superadmin/settings', icon: '⚙️', label: 'Settings' },
    ],
  },
];

const PAGE_TITLES = {
  '/superadmin/dashboard': 'Dashboard',
  '/superadmin/companies': 'Companies',
  '/superadmin/invoices': 'Invoices',
  '/superadmin/plans': 'Plans',
  '/superadmin/api-keys': 'API Keys',
  '/superadmin/settings': 'Settings',
};

export default function SuperAdminLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector(state => state.auth);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const currentPage = PAGE_TITLES[location.pathname] || 'Super Admin';
  const initials = (user?.name || user?.email || 'SA').slice(0, 2).toUpperCase();

  return (
    <div className="sa-root">
      {/* Sidebar */}
      <aside className="sa-sidebar">
        <div className="sa-sidebar-logo">
          <div className="sa-logo-badge">
            <span className="sa-logo-dot" />
            WA SaaS
          </div>
          <div className="sa-logo-sub">Super Admin Panel</div>
        </div>

        <nav className="sa-nav">
          {NAV.map(section => (
            <div className="sa-nav-section" key={section.label}>
              <div className="sa-nav-label">{section.label}</div>
              {section.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `sa-nav-item${isActive ? ' active' : ''}`
                  }
                >
                  <span style={{ fontSize: '16px', lineHeight: 1 }}>{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sa-sidebar-footer">
          <div className="sa-user-pill">
            <div className="sa-avatar">{initials}</div>
            <div className="sa-user-info">
              <div className="sa-user-name">{user?.name || user?.email || 'Admin'}</div>
              <div className="sa-user-role">Super Admin</div>
            </div>
            <button className="sa-logout-btn" onClick={handleLogout} title="Logout">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <main className="sa-main">
        {/* Top bar */}
        <div className="sa-topbar">
          <div className="sa-breadcrumb">
            <span className="sa-breadcrumb-root">Super Admin</span>
            <span className="sa-breadcrumb-sep">/</span>
            <span className="sa-breadcrumb-page">{currentPage}</span>
          </div>
          <div className="sa-topbar-actions">
            <div className="sa-topbar-badge">
              <span className="sa-topbar-dot" />
              System Online
            </div>
            <button
              className="sa-btn sa-btn-secondary sa-btn-sm"
              onClick={() => navigate('/dashboard')}
            >
              ← User Panel
            </button>
          </div>
        </div>

        {/* Page content */}
        <div className="sa-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
