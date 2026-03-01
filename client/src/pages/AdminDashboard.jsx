import React, { useEffect, useState } from "react";
import { BarChart3, Users, CreditCard, MessageCircle, Loader, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "../styles/admin.css";

function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/stats");
      setStats(res.data.stats);
    } catch (err) {
      if (err.response?.status === 403) {
        setError("Admin access required");
      } else {
        setError("Failed to load stats");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="admin-dashboard">
      <div className="loading-state"><Loader size={32} className="spinner" /><p>Loading...</p></div>
    </div>
  );

  if (error) return (
    <div className="admin-dashboard">
      <div className="alert alert-error"><AlertCircle size={18} /> {error}</div>
    </div>
  );

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <p>Platform overview and statistics</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><Users size={32} /></div>
          <div className="stat-content">
            <h3>Total Companies</h3>
            <p className="stat-number">{stats?.totalCompanies || 0}</p>
            <p className="stat-sub">{stats?.activeCompanies || 0} active</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><MessageCircle size={32} /></div>
          <div className="stat-content">
            <h3>Total Messages</h3>
            <p className="stat-number">{stats?.totalMessages?.toLocaleString() || 0}</p>
            <p className="stat-sub">{stats?.recentMessages || 0} last 7 days</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><BarChart3 size={32} /></div>
          <div className="stat-content">
            <h3>Active Devices</h3>
            <p className="stat-number">{stats?.connectedDevices || 0}</p>
            <p className="stat-sub">{stats?.totalDevices || 0} total</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><CreditCard size={32} /></div>
          <div className="stat-content">
            <h3>Total Revenue</h3>
            <p className="stat-number">${stats?.totalRevenue?.toLocaleString() || 0}</p>
          </div>
        </div>
      </div>

      <div className="admin-quick-links">
        <button className="btn-primary" onClick={() => navigate("/admin/companies")}>Manage Companies</button>
        <button className="btn-secondary" onClick={() => navigate("/admin/plans")}>Manage Plans</button>
      </div>
    </div>
  );
}

export default AdminDashboard;
