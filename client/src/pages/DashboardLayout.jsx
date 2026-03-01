import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../redux/authSlice';
import {
  MessageCircle, Smartphone, MessageSquare, CreditCard, FileText,
  LogOut, Menu, X, Settings, Zap
} from 'lucide-react';
import '../styles/dashboard.css';

function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  const menuItems = [
    { path: '/dashboard/devices', label: 'Devices', icon: Smartphone },
    { path: '/dashboard/messages', label: 'Messages', icon: MessageCircle },
    { path: '/dashboard/chats', label: 'Chats', icon: MessageSquare },
    { path: '/dashboard/autoreply', label: 'Auto-Reply', icon: Zap },
    { path: '/dashboard/subscription', label: 'Subscription', icon: CreditCard },
    { path: '/dashboard/invoices', label: 'Invoices', icon: FileText },
    { path: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h2>WhatsApp SaaS</h2>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`nav-item ${isActive ? 'active' : ''}`}
                style={{ cursor: 'pointer', background: 'none', border: 'none' }}
              >
                <Icon size={20} />
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info" style={{ display: sidebarOpen ? 'block' : 'none' }}>
            <p className="user-name">{user?.companyName}</p>
            <p className="user-email">{user?.email}</p>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            <LogOut size={20} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        <header className="dashboard-header">
          <button
            className="menu-button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu size={24} />
          </button>
          <h1 className="page-title">Dashboard</h1>
          <button className="settings-button" onClick={() => navigate('/dashboard/settings')} title="Settings">
            <Settings size={24} />
          </button>
        </header>

        <div className="dashboard-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default DashboardLayout;
