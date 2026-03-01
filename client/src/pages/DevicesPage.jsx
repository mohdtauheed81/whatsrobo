import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDevices, createDevice, deleteDevice } from '../redux/devicesSlice';
import { Plus, Trash2, Smartphone, Circle, QrCode, Loader, Check, MessageCircle } from 'lucide-react';
import socketService from '../services/socket';
import QRScannerModal from '../components/QRScannerModal';
import '../styles/devices.css';

function DevicesPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { devices, loading } = useSelector(state => state.devices);
  const [showModal, setShowModal] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scanningDeviceId, setScanningDeviceId] = useState(null);
  const [connectingDevice, setConnectingDevice] = useState(null);
  const [qrCodes, setQrCodes] = useState({});
  const [deviceStatuses, setDeviceStatuses] = useState({});

  // Get token from localStorage (it's stored there after login/registration)
  const token = localStorage.getItem('token');

  useEffect(() => {
    dispatch(fetchDevices());
  }, [dispatch]);

  // Memoize handler functions with useCallback to maintain stable references
  const handleQrCode = useCallback((data) => {
    console.log('🔥 QR code received on frontend:', data);
    setQrCodes(prev => ({
      ...prev,
      [data.deviceId]: data.qrCode
    }));
    setDeviceStatuses(prev => ({
      ...prev,
      [data.deviceId]: 'qr_pending'
    }));
    setConnectingDevice(null);
  }, []);

  const handleStatusChange = useCallback((data) => {
    console.log('🔥 Device status changed:', data);
    setDeviceStatuses(prev => ({
      ...prev,
      [data.deviceId]: data.status
    }));
    // If connected, close modal after 2 seconds and redirect to chats
    if (data.status === 'connected') {
      console.log('✅ Device connected! Status:', data.status);
      setTimeout(() => {
        console.log('Closing QR scanner modal and navigating to chats');
        setShowQRScanner(false);
        setScanningDeviceId(null);
        dispatch(fetchDevices());
        // Navigate to chats page to access messages
        navigate('/dashboard/chats');
      }, 1500);
    } else {
      // Refresh devices list
      dispatch(fetchDevices());
    }
  }, [dispatch, navigate]);

  // Socket.IO listener for QR codes
  useEffect(() => {
    if (!token || !scanningDeviceId) return;

    // Initialize device socket
    const socket = socketService.connectDevice(token);

    // Subscribe to this specific device room
    socket.emit('subscribe_device', { deviceId: scanningDeviceId });

    socket.on('qr_code', handleQrCode);
    socket.on('status_change', handleStatusChange);

    console.log('📡 Socket.IO connected for device:', scanningDeviceId);

    return () => {
      socket.off('qr_code', handleQrCode);
      socket.off('status_change', handleStatusChange);
    };
  }, [token, scanningDeviceId, handleQrCode, handleStatusChange]);

  const handleCreate = async (e) => {
    e.preventDefault();
    await dispatch(createDevice({ name: deviceName }));
    setDeviceName('');
    setShowModal(false);
  };

  const handleConnect = async (deviceId) => {
    try {
      setConnectingDevice(deviceId);
      setScanningDeviceId(deviceId);

      const apiUrl = `${import.meta.env.VITE_API_URL}/devices/${deviceId}/connect`;
      console.log('📍 Calling API:', apiUrl);
      console.log('🔐 Token:', token ? 'Present' : 'Missing');

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 API Response Status:', response.status);
      console.log('📡 API Response OK:', response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Full API Response:', data);
        console.log('📊 Device data:', data.device);
        console.log('📊 QR Code URL type:', typeof data.device.qrCodeUrl);
        console.log('📊 QR Code URL length:', data.device.qrCodeUrl ? data.device.qrCodeUrl.length : 0);
        console.log('✅ Device connection initiated');
        console.log('📱 QR Code received:', data.device.qrCodeUrl ? 'YES (length: ' + data.device.qrCodeUrl.length + ')' : 'NO');

        if (data.device.qrCodeUrl) {
          console.log('✓ QR code available, showing modal');
          setQrCodes(prev => ({
            ...prev,
            [deviceId]: data.device.qrCodeUrl
          }));
        } else {
          console.log('⏳ Waiting for QR code from Socket.IO...');
        }

        // Open QR Scanner Modal
        setShowQRScanner(true);
        setDeviceStatuses(prev => ({
          ...prev,
          [deviceId]: 'qr_pending'
        }));
      } else {
        const error = await response.json();
        console.error('❌ Connection error:', error);
        alert('Error: ' + error.error);
        setConnectingDevice(null);
      }
    } catch (error) {
      console.error('❌ Failed to connect device:', error);
      alert('Failed to connect device: ' + error.message);
      setConnectingDevice(null);
    }
  };

  const handleDelete = (deviceId) => {
    if (window.confirm('Are you sure you want to delete this device?')) {
      dispatch(deleteDevice(deviceId));
    }
  };

  const handleDisconnect = async (deviceId) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/devices/${deviceId}/disconnect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        alert('Device disconnected successfully');
        dispatch(fetchDevices());
      } else {
        const error = await response.json();
        alert('Error: ' + error.error);
      }
    } catch (error) {
      console.error('Failed to disconnect device:', error);
      alert('Failed to disconnect device');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      connected: '#10b981',
      disconnected: '#ef4444',
      connecting: '#f59e0b',
      qr_pending: '#3b82f6',
    };
    return colors[status] || '#gray';
  };

  return (
    <div className="devices-page">
      <div className="page-header">
        <h1>WhatsApp Devices</h1>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={20} />
          Add Device
        </button>
      </div>

      {/* Device List */}
      <div className="devices-grid">
        {devices.length === 0 ? (
          <div className="empty-state">
            <Smartphone size={48} />
            <h3>No devices yet</h3>
            <p>Add your first WhatsApp device to get started</p>
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={20} />
              Create Device
            </button>
          </div>
        ) : (
          devices.map(device => (
            <div key={device._id} className="device-card">
              <div className="device-header">
                <div className="device-info">
                  <Smartphone size={24} />
                  <h3>{device.name}</h3>
                </div>
                <div className="device-status">
                  <Circle size={12} fill={getStatusColor(device.status)} color={getStatusColor(device.status)} />
                  <span>{device.status}</span>
                </div>
              </div>

              <div className="device-details">
                {device.phoneNumber && (
                  <p><strong>Phone:</strong> {device.phoneNumber}</p>
                )}
                <p><strong>Created:</strong> {new Date(device.createdAt).toLocaleDateString()}</p>
              </div>

              <div className="device-actions">
                {device.status === 'disconnected' && (
                  <button
                    className="btn-primary"
                    onClick={() => handleConnect(device._id)}
                    disabled={connectingDevice === device._id}
                  >
                    {connectingDevice === device._id ? (
                      <>
                        <Loader size={16} className="spinner" />
                        Generating QR...
                      </>
                    ) : (
                      <>
                        <QrCode size={16} />
                        Start Connection
                      </>
                    )}
                  </button>
                )}
                {device.status === 'qr_pending' && (
                  <button className="btn-warning" disabled>
                    <Loader size={16} className="spinner" />
                    Waiting for Scan
                  </button>
                )}
                {device.status === 'connecting' && (
                  <button className="btn-warning" disabled>
                    <Loader size={16} className="spinner" />
                    Connecting
                  </button>
                )}
                {device.status === 'connected' && (
                  <>
                    <button className="btn-success" disabled>
                      <Check size={16} />
                      Connected
                    </button>
                    <button
                      className="btn-warning"
                      onClick={() => handleDisconnect(device._id)}
                    >
                      Disconnect
                    </button>
                  </>
                )}
                <button
                  className="btn-danger"
                  onClick={() => handleDelete(device._id)}
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* QR Scanner Modal */}
      {showQRScanner && scanningDeviceId && (
        <QRScannerModal
          device={devices.find(d => d._id === scanningDeviceId)}
          qrCode={qrCodes[scanningDeviceId]}
          onClose={() => {
            setShowQRScanner(false);
            setScanningDeviceId(null);
          }}
          isConnecting={connectingDevice === scanningDeviceId}
          status={deviceStatuses[scanningDeviceId] || 'qr_pending'}
        />
      )}

      {/* Create Device Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Add New Device</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Device Name</label>
                <input
                  type="text"
                  value={deviceName}
                  onChange={e => setDeviceName(e.target.value)}
                  placeholder="My WhatsApp Device"
                  required
                />
              </div>
              <div className="modal-buttons">
                <button type="submit" className="btn-primary">Create</button>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DevicesPage;
