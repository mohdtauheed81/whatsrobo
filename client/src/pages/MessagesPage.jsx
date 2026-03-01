import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { sendMessage, uploadBulk, fetchBulkJobs } from '../redux/messagesSlice';
import { fetchDevices } from '../redux/devicesSlice';
import { Send, Upload, FileUp, Check, AlertCircle, Download } from 'lucide-react';
import api from '../services/api';
import '../styles/messages.css';

function MessagesPage() {
  const dispatch = useDispatch();
  const { messages, loading, bulkJobs, error } = useSelector(state => state.messages);
  const { devices } = useSelector(state => state.devices);
  const [activeTab, setActiveTab] = useState('send');
  const [formData, setFormData] = useState({ deviceId: '', phoneNumber: '', message: '' });
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkDeviceId, setBulkDeviceId] = useState('');
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    dispatch(fetchDevices());
    dispatch(fetchBulkJobs());
  }, [dispatch]);

  const connectedDevices = devices.filter(d => d.status === 'connected');

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (formData.deviceId && formData.phoneNumber && formData.message) {
      const messageData = {
        deviceId: formData.deviceId,
        recipientNumber: formData.phoneNumber,
        message: formData.message
      };
      const result = await dispatch(sendMessage(messageData));
      if (sendMessage.fulfilled.match(result)) {
        setSuccessMsg('Message queued successfully!');
        setFormData({ ...formData, phoneNumber: '', message: '' });
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    }
  };

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (bulkFile && bulkDeviceId) {
      const formDataObj = new FormData();
      formDataObj.append('file', bulkFile);
      formDataObj.append('deviceId', bulkDeviceId);
      const result = await dispatch(uploadBulk(formDataObj));
      if (uploadBulk.fulfilled.match(result)) {
        setSuccessMsg('Bulk job started! ' + (result.payload.message || ''));
        setBulkFile(null);
        setTimeout(() => setSuccessMsg(null), 5000);
      }
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(apiBase + '/messages/bulk/template/download', {
        headers: { Authorization: 'Bearer ' + token }
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'bulk_message_template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download template');
    }
  };

  const getJobStatusColor = (status) => {
    const colors = { completed: '#10b981', processing: '#3b82f6', failed: '#ef4444', pending: '#f59e0b' };
    return colors[status] || '#64748b';
  };

  return (
    <div className="messages-page">
      <div className="page-header">
        <h1>Messages</h1>
        <div className="tabs">
          <button className={'tab' + (activeTab === 'send' ? ' active' : '')} onClick={() => setActiveTab('send')}>
            Send Message
          </button>
          <button className={'tab' + (activeTab === 'bulk' ? ' active' : '')} onClick={() => setActiveTab('bulk')}>
            Bulk Send
          </button>
        </div>
      </div>

      {successMsg && <div className="alert alert-success"><Check size={18} /> {successMsg}</div>}
      {error && <div className="alert alert-error"><AlertCircle size={18} /> {error}</div>}

      {/* Send Single Message */}
      {activeTab === 'send' && (
        <div className="message-card">
          <h2>Send Message</h2>
          <form onSubmit={handleSendMessage}>
            <div className="form-group">
              <label>Select Device</label>
              <select
                value={formData.deviceId}
                onChange={e => setFormData({ ...formData, deviceId: e.target.value })}
                required
              >
                <option value="">Choose a device...</option>
                {connectedDevices.map(device => (
                  <option key={device._id} value={device._id}>
                    {device.name} {device.phoneNumber ? '(' + device.phoneNumber + ')' : ''}
                  </option>
                ))}
              </select>
              {connectedDevices.length === 0 && (
                <p className="form-hint">No connected devices. Connect a device first.</p>
              )}
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                placeholder="+1234567890 or 1234567890"
                required
              />
            </div>
            <div className="form-group">
              <label>Message</label>
              <textarea
                value={formData.message}
                onChange={e => setFormData({ ...formData, message: e.target.value })}
                placeholder="Type your message..."
                rows="5"
                required
              />
            </div>
            <button type="submit" className="btn-primary" disabled={loading || connectedDevices.length === 0}>
              <Send size={20} />
              {loading ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>
      )}

      {/* Bulk Send */}
      {activeTab === 'bulk' && (
        <div className="message-card">
          <div className="bulk-header">
            <h2>Bulk Send</h2>
            <button type="button" className="btn-secondary" onClick={handleDownloadTemplate}>
              <Download size={16} /> Download Template
            </button>
          </div>
          <p className="form-hint">Upload an Excel file with columns: Phone Number | Message | Name</p>

          <form onSubmit={handleBulkUpload}>
            <div className="form-group">
              <label>Select Device</label>
              <select value={bulkDeviceId} onChange={e => setBulkDeviceId(e.target.value)} required>
                <option value="">Choose a device...</option>
                {connectedDevices.map(device => (
                  <option key={device._id} value={device._id}>
                    {device.name} {device.phoneNumber ? '(' + device.phoneNumber + ')' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Excel File (.xlsx or .xls)</label>
              <div className="file-input-wrapper">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={e => setBulkFile(e.target.files[0])}
                  required
                />
                <div className="file-info">
                  <FileUp size={32} />
                  <p>{bulkFile ? bulkFile.name : 'Click to upload Excel file'}</p>
                </div>
              </div>
            </div>
            <button type="submit" className="btn-primary" disabled={loading || !bulkFile || connectedDevices.length === 0}>
              <Upload size={20} />
              {loading ? 'Processing...' : 'Upload & Send'}
            </button>
          </form>

          {/* Bulk Jobs List */}
          {bulkJobs.length > 0 && (
            <div className="bulk-jobs">
              <h3>Bulk Jobs</h3>
              {bulkJobs.map(job => {
                const progress = job.progress?.sent || 0;
                const total = job.totalContacts || 1;
                const pct = Math.round((progress / total) * 100);
                return (
                  <div key={job._id} className="bulk-job">
                    <div className="bulk-job-header">
                      <h4>{job.batchName}</h4>
                      <span className="badge" style={{ backgroundColor: getJobStatusColor(job.status) + '20', color: getJobStatusColor(job.status) }}>
                        {job.status}
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: pct + '%' }} />
                    </div>
                    <p>{progress} / {total} sent ({pct}%)</p>
                    {job.progress?.failed > 0 && (
                      <p className="text-danger">{job.progress.failed} failed</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MessagesPage;
