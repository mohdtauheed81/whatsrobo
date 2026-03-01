import React, { useEffect, useState } from 'react';
import { X, Loader, Check, AlertCircle } from 'lucide-react';
import '../styles/qr-scanner-modal.css';

function QRScannerModal({ device, qrCode, onClose, isConnecting, status }) {
  const [countdown, setCountdown] = useState(60);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getStatusDisplay = () => {
    if (status === 'connected') {
      return { text: '✅ Connected!', color: 'success', icon: Check };
    }
    if (status === 'connecting') {
      return { text: '⏳ Connecting...', color: 'warning', icon: Loader };
    }
    if (status === 'qr_pending') {
      return { text: '📱 Ready to Scan', color: 'info', icon: AlertCircle };
    }
    return { text: 'Scanning QR Code', color: 'info', icon: AlertCircle };
  };

  const statusDisplay = getStatusDisplay();
  const StatusIcon = statusDisplay.icon;

  return (
    <div className="qr-scanner-overlay">
      <div className="qr-scanner-modal">
        {/* Header */}
        <div className="qr-header">
          <h2>Connect WhatsApp Device</h2>
          <button className="qr-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Device Info */}
        <div className="qr-device-info">
          <h3>{device?.name}</h3>
          <div className={`qr-status ${statusDisplay.color}`}>
            <StatusIcon size={16} className="status-icon" />
            {statusDisplay.text}
          </div>
        </div>

        {/* Main Content */}
        <div className="qr-content">
          {/* QR Code Section */}
          <div className="qr-code-section">
            <div className="qr-code-container">
              {qrCode ? (
                <>
                  <img src={qrCode} alt="QR Code" className="qr-code-image" />
                  <div className="qr-instructions">
                    <h4>📱 Scan with WhatsApp</h4>
                    <ol>
                      <li>Open <strong>WhatsApp</strong> on your phone</li>
                      <li>Go to <strong>Settings → Linked Devices</strong></li>
                      <li>Tap <strong>"Link a Device"</strong></li>
                      <li><strong>Point your camera</strong> at this QR code</li>
                      <li>Wait for WhatsApp to verify</li>
                    </ol>
                  </div>
                </>
              ) : (
                <div className="qr-loading">
                  <Loader size={40} className="spinner" />
                  <p>Generating QR code...</p>
                </div>
              )}
            </div>

            {/* Countdown Timer */}
            {countdown > 0 && (
              <div className="qr-timer">
                <div className={`timer-circle ${countdown <= 10 ? 'warning' : ''}`}>
                  <span className="timer-number">{countdown}</span>
                  <span className="timer-label">sec</span>
                </div>
                <p className="timer-text">QR Code expires in {countdown} seconds</p>
              </div>
            )}

            {countdown === 0 && status !== 'connected' && (
              <div className="qr-expired">
                <AlertCircle size={32} />
                <p>QR Code expired. Please click "Connect" again.</p>
              </div>
            )}
          </div>

          {/* Status Messages */}
          <div className="qr-status-messages">
            {status === 'qr_pending' && (
              <div className="status-message info">
                {qrCode ? (
                  <>
                    <AlertCircle size={20} />
                    <div>
                      <strong>Ready to Scan</strong>
                      <p>Your device is ready. Open WhatsApp on your phone and scan the QR code.</p>
                    </div>
                  </>
                ) : (
                  <>
                    <Loader size={20} className="spinner" />
                    <div>
                      <strong>Generating QR Code...</strong>
                      <p>Initializing WhatsApp connection. This may take a few seconds.</p>
                    </div>
                  </>
                )}
              </div>
            )}

            {status === 'connecting' && (
              <div className="status-message warning">
                <Loader size={20} className="spinner" />
                <div>
                  <strong>Connecting...</strong>
                  <p>WhatsApp is verifying your device. Please wait.</p>
                </div>
              </div>
            )}

            {status === 'connected' && (
              <div className="status-message success">
                <Check size={20} />
                <div>
                  <strong>Connected Successfully!</strong>
                  <p>Your WhatsApp device is now connected and ready to send messages.</p>
                </div>
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="qr-tips">
            <h4>💡 Tips:</h4>
            <ul>
              <li>Make sure your phone has WhatsApp installed</li>
              <li>Keep the screen visible for scanning</li>
              <li>Internet connection is required</li>
              <li>One device can be linked to WhatsApp at a time</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="qr-footer">
          {status === 'connected' ? (
            <button className="btn-primary" onClick={onClose}>
              <Check size={16} />
              Done
            </button>
          ) : (
            <button className="btn-secondary" onClick={onClose}>
              <X size={16} />
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default QRScannerModal;
