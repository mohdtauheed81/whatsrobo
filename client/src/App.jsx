import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import ProtectedRoute from './components/ProtectedRoute';
import { checkAuth } from './redux/authSlice';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardLayout from './pages/DashboardLayout';
import DevicesPage from './pages/DevicesPage';
import MessagesPage from './pages/MessagesPage';
import ChatsPage from './pages/ChatsPage';
import AutoReplyPage from './pages/AutoReplyPage';
import SubscriptionPage from './pages/SubscriptionPage';
import InvoicesPage from './pages/InvoicesPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminCompanies from './pages/AdminCompanies';
import AdminPlans from './pages/AdminPlans';
import SettingsPage from './pages/SettingsPage';

// Super Admin Pages
import SuperAdminLayout from './pages/superadmin/SuperAdminLayout';
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import SuperAdminCompanies from './pages/superadmin/SuperAdminCompanies';
import SuperAdminInvoices from './pages/superadmin/SuperAdminInvoices';
import SuperAdminPlans from './pages/superadmin/SuperAdminPlans';
import SuperAdminSettings from './pages/superadmin/SuperAdminSettings';
import SuperAdminAPIKeys from './pages/superadmin/SuperAdminAPIKeys';

function App() {
  const dispatch = useDispatch();
  const { isAuthenticated, isAdmin } = useSelector(state => state.auth);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      dispatch(checkAuth());
    }
  }, [dispatch]);

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={isAuthenticated ? <Navigate to={isAdmin ? '/superadmin' : '/dashboard'} /> : <LoginPage />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" /> : <RegisterPage />} />

      {/* User Dashboard Routes */}
      <Route
        path="/dashboard/*"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <Routes>
              <Route element={<DashboardLayout />}>
                <Route path="devices" element={<DevicesPage />} />
                <Route path="messages" element={<MessagesPage />} />
                <Route path="chats" element={<ChatsPage />} />
                <Route path="autoreply" element={<AutoReplyPage />} />
                <Route path="subscription" element={<SubscriptionPage />} />
                <Route path="invoices" element={<InvoicesPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route index element={<Navigate to="devices" replace />} />
              </Route>
            </Routes>
          </ProtectedRoute>
        }
      />

      {/* Legacy Admin Routes */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated} requireAdmin={true} userIsAdmin={isAdmin}>
            <Routes>
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="companies" element={<AdminCompanies />} />
              <Route path="plans" element={<AdminPlans />} />
              <Route index element={<Navigate to="dashboard" replace />} />
            </Routes>
          </ProtectedRoute>
        }
      />

      {/* Super Admin Routes */}
      <Route
        path="/superadmin/*"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated} requireAdmin={true} userIsAdmin={isAdmin}>
            <Routes>
              <Route element={<SuperAdminLayout />}>
                <Route path="dashboard" element={<SuperAdminDashboard />} />
                <Route path="companies" element={<SuperAdminCompanies />} />
                <Route path="invoices" element={<SuperAdminInvoices />} />
                <Route path="plans" element={<SuperAdminPlans />} />
                <Route path="settings" element={<SuperAdminSettings />} />
                <Route path="api-keys" element={<SuperAdminAPIKeys />} />
                <Route index element={<Navigate to="dashboard" replace />} />
              </Route>
            </Routes>
          </ProtectedRoute>
        }
      />

      {/* Landing Page */}
      <Route path="/" element={<LandingPage />} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
