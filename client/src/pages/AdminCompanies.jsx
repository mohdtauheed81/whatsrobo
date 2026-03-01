import React, { useEffect, useState } from "react";
import { Trash2, Eye, Search, Loader, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import api from "../services/api";
import "../styles/admin.css";

function AdminCompanies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async (page = 1, search = searchQuery) => {
    try {
      setLoading(true);
      const res = await api.get("/admin/companies", { params: { page, limit: 20, search } });
      setCompanies(res.data.companies || []);
      setPagination(res.data.pagination || { page: 1, pages: 1 });
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load companies");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadCompanies(1, searchQuery);
  };

  const handleDelete = async (companyId) => {
    if (!window.confirm("Are you sure you want to delete this company? This is irreversible.")) return;
    try {
      setDeleting(companyId);
      await api.delete("/admin/companies/" + companyId);
      setCompanies(prev => prev.filter(c => c._id !== companyId));
    } catch (err) {
      alert(err.response?.data?.error || "Failed to delete company");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="admin-companies">
      <div className="admin-header">
        <h1>Manage Companies</h1>
        <p>{pagination.total || 0} total companies</p>
      </div>

      {error && <div className="alert alert-error"><AlertCircle size={18} /> {error}</div>}

      <form className="search-bar" onSubmit={handleSearch}>
        <Search size={20} />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <button type="submit" className="btn-secondary">Search</button>
      </form>

      {loading ? (
        <div className="loading-state"><Loader size={32} className="spinner" /></div>
      ) : (
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Company Name</th>
                <th>Email</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Usage</th>
                <th>Expires</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.map(company => (
                <tr key={company._id}>
                  <td>{company.companyName}</td>
                  <td>{company.email}</td>
                  <td>{company.subscriptionPlan?.name || "N/A"}</td>
                  <td>
                    <span className={"badge" + (company.isSubscriptionActive ? " active" : " inactive")}>
                      {company.isSubscriptionActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>{company.usageStats?.messagesThisMonth?.toLocaleString() || 0}/month</td>
                  <td>{company.subscriptionEndDate ? new Date(company.subscriptionEndDate).toLocaleDateString() : "N/A"}</td>
                  <td className="actions">
                    <button className="btn-icon" title="View" onClick={() => setSelectedCompany(company)}>
                      <Eye size={18} />
                    </button>
                    <button
                      className="btn-icon danger"
                      title="Delete"
                      disabled={deleting === company._id}
                      onClick={() => handleDelete(company._id)}
                    >
                      {deleting === company._id ? <Loader size={18} className="spinner" /> : <Trash2 size={18} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {companies.length === 0 && <div className="empty-state"><p>No companies found</p></div>}
        </div>
      )}

      {pagination.pages > 1 && (
        <div className="pagination">
          <button disabled={pagination.page <= 1} onClick={() => loadCompanies(pagination.page - 1)}>
            <ChevronLeft size={18} />
          </button>
          <span>Page {pagination.page} of {pagination.pages}</span>
          <button disabled={pagination.page >= pagination.pages} onClick={() => loadCompanies(pagination.page + 1)}>
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Company Detail Modal */}
      {selectedCompany && (
        <div className="modal-overlay" onClick={() => setSelectedCompany(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{selectedCompany.companyName}</h2>
            <div className="company-detail">
              <p><strong>Email:</strong> {selectedCompany.email}</p>
              <p><strong>Plan:</strong> {selectedCompany.subscriptionPlan?.name}</p>
              <p><strong>Messages This Month:</strong> {selectedCompany.usageStats?.messagesThisMonth?.toLocaleString() || 0}</p>
              <p><strong>Total Messages:</strong> {selectedCompany.usageStats?.totalMessagesAllTime?.toLocaleString() || 0}</p>
              <p><strong>Subscription Ends:</strong> {selectedCompany.subscriptionEndDate ? new Date(selectedCompany.subscriptionEndDate).toLocaleDateString() : "N/A"}</p>
              <p><strong>Joined:</strong> {new Date(selectedCompany.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="modal-buttons">
              <button className="btn-secondary" onClick={() => setSelectedCompany(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminCompanies;
