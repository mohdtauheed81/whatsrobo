import React, { useEffect, useState } from "react";
import { Download, FileText, Loader, AlertCircle } from "lucide-react";
import api from "../services/api";
import "../styles/invoices.css";

function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });

  useEffect(() => { loadInvoices(); }, []);

  const loadInvoices = async (page = 1) => {
    try {
      setLoading(true);
      const res = await api.get("/invoices", { params: { page, limit: 10 } });
      setInvoices(res.data.invoices || []);
      setPagination(res.data.pagination || { page: 1, pages: 1 });
    } catch (err) {
      setError("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (invoiceId, invoiceNumber) => {
    try {
      setDownloading(invoiceId);
      const token = localStorage.getItem("token");
      const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
      const link = document.createElement("a");
      link.href = apiBase + "/invoices/" + invoiceId + "/download";
      link.setAttribute("download", "invoice_" + invoiceNumber + ".pdf");
      // Use fetch to download with auth header
      const response = await fetch(link.href, { headers: { Authorization: "Bearer " + token } });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to download invoice");
    } finally {
      setDownloading(null);
    }
  };

  const getStatusBadge = (status) => {
    const map = { paid: "badge-success", issued: "badge-info", overdue: "badge-danger", cancelled: "badge-secondary" };
    return map[status] || "badge-secondary";
  };

  if (loading) return (
    <div className="invoices-page">
      <div className="loading-state"><Loader size={32} className="spinner" /><p>Loading invoices...</p></div>
    </div>
  );

  return (
    <div className="invoices-page">
      <div className="page-header">
        <h1>Invoices</h1>
        <p>View and download your billing invoices</p>
      </div>

      {error && <div className="alert alert-error"><AlertCircle size={18} /> {error}</div>}

      {invoices.length === 0 ? (
        <div className="empty-state">
          <FileText size={48} />
          <h3>No invoices yet</h3>
          <p>Your invoices will appear here once you have a paid subscription</p>
        </div>
      ) : (
        <>
          <div className="invoices-table">
            <table>
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Date</th>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(invoice => (
                  <tr key={invoice._id}>
                    <td>{invoice.invoiceNumber}</td>
                    <td>{new Date(invoice.issuedAt).toLocaleDateString()}</td>
                    <td>{invoice.subscriptionPlan?.name || "N/A"}</td>
                    <td>${invoice.amount?.totalAmount?.toFixed(2) || "0.00"}</td>
                    <td><span className={"badge " + getStatusBadge(invoice.status)}>{invoice.status}</span></td>
                    <td className="actions">
                      <button
                        className="btn-icon"
                        onClick={() => handleDownload(invoice._id, invoice.invoiceNumber)}
                        disabled={downloading === invoice._id}
                        title="Download PDF"
                      >
                        {downloading === invoice._id ? <Loader size={18} className="spinner" /> : <Download size={18} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pagination.pages > 1 && (
            <div className="pagination">
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  className={"page-btn" + (p === pagination.page ? " active" : "")}
                  onClick={() => loadInvoices(p)}
                >{p}</button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default InvoicesPage;
