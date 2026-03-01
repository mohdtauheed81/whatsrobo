const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const path = require('path');
const logger = require('../../config/logger');
const Device = require('../../models/Device');

class ClientInstance {
  constructor(deviceId, deviceData, io) {
    this.deviceId = deviceId;
    this.device = deviceData;
    this.io = io;
    this.client = null;
    this.isReady = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = parseInt(process.env.MAX_RECONNECT_ATTEMPTS || '5');
    this.reconnectBackoffInitial = parseInt(process.env.RECONNECT_BACKOFF_INITIAL || '1000');
    this.reconnectBackoffMax = parseInt(process.env.RECONNECT_BACKOFF_MAX || '60000');
    this.lastReconnectAttempt = null;
    this.qrTimeout = null;
  }

  /**
   * Initialize WhatsApp client
   */
  async initialize() {
    try {
      logger.info('Initializing WhatsApp client', { deviceId: this.deviceId });

      const sessionPath = path.join(
        process.env.SESSION_PATH || './sessions',
        this.deviceId.toString()
      );

      this.client = new Client({
        authStrategy: new LocalAuth({
          clientId: this.deviceId.toString(),
          dataPath: sessionPath
        }),
        puppeteer: {
          headless: this.device.clientConfig?.headless !== false,
          args: this.device.clientConfig?.args || ['--no-sandbox', '--disable-setuid-sandbox']
        },
        ffmpeg: {
          path: 'ffmpeg'
        },
        takeoverOnConflict: true,
        takeoverTimeoutMs: 30000,
        qrTimeoutMs: 0
      });

      this.setupEventHandlers();
      await this.client.initialize();
      logger.info('WhatsApp client initialized', { deviceId: this.deviceId });
    } catch (error) {
      logger.error('Failed to initialize client', { deviceId: this.deviceId, error: error.message });
      throw error;
    }
  }

  /**
   * Set up event handlers for the client
   */
  setupEventHandlers() {
    // QR Code event
    this.client.on('qr', async (qr) => {
      try {
        logger.info('QR code received', { deviceId: this.deviceId });

        // Generate QR code image
        const qrImage = await QRCode.toDataURL(qr);

        // Save QR to device
        await Device.findByIdAndUpdate(
          this.deviceId,
          {
            status: 'qr_pending',
            qrCodeUrl: qrImage,
            qrCodeExpiry: new Date(Date.now() + 60000)
          }
        );

        // Emit QR code via Socket.IO
        this.io.of('/device').to(`device:${this.deviceId}`).emit('qr_code', {
          deviceId: this.deviceId.toString(),
          qrCode: qrImage,
          timestamp: new Date(),
          expiresIn: 60
        });

        // Clear previous timeout
        if (this.qrTimeout) clearTimeout(this.qrTimeout);

        // Auto-disconnect if QR not scanned after 2 minutes
        this.qrTimeout = setTimeout(() => {
          this.disconnect();
        }, 120000);
      } catch (error) {
        logger.error('QR code error', { deviceId: this.deviceId, error: error.message });
      }
    });

    // Ready event
    this.client.on('ready', async () => {
      try {
        logger.info('WhatsApp client ready', { deviceId: this.deviceId });

        // Clear QR timeout
        if (this.qrTimeout) clearTimeout(this.qrTimeout);

        this.isReady = true;
        this.reconnectAttempts = 0;

        // Get phone number
        const info = this.client.info;
        const phoneNumber = info.wid.user;

        // Update device status
        await Device.findByIdAndUpdate(
          this.deviceId,
          {
            status: 'connected',
            phoneNumber,
            lastConnected: new Date(),
            connectionAttempts: 0,
            errorMessage: null,
            qrCodeUrl: null
          }
        );

        // Emit connection success
        this.io.of('/device').to(`device:${this.deviceId}`).emit('status_change', {
          deviceId: this.deviceId.toString(),
          status: 'connected',
          phoneNumber,
          timestamp: new Date()
        });
      } catch (error) {
        logger.error('Ready event error', { deviceId: this.deviceId, error: error.message });
      }
    });

    // Message event
    this.client.on('message', async (msg) => {
      try {
        if (!msg.fromMe && msg.type === 'chat') {
          // Emit incoming message via Socket.IO
          const companyId = this.device.companyId;
          this.io.of('/chat').to(`company:${companyId}`).emit('incoming_message', {
            deviceId: this.deviceId.toString(),
            from: msg.from,
            contactName: msg._data.notifyName || 'Unknown',
            message: msg.body,
            timestamp: msg.timestamp * 1000,
            whatsappMessageId: msg.id.id
          });
        }
      } catch (error) {
        logger.error('Message event error', { deviceId: this.deviceId, error: error.message });
      }
    });

    // Message ACK event
    this.client.on('message_ack', async (msg, ack) => {
      try {
        const companyId = this.device.companyId;
        let status = 'sent';
        if (ack === 2) status = 'delivered';
        if (ack === 3) status = 'read';

        // Emit status update via Socket.IO
        this.io.of('/chat').to(`company:${companyId}`).emit('message_status', {
          whatsappMessageId: msg.id.id,
          status,
          timestamp: new Date()
        });
      } catch (error) {
        logger.error('Message ACK error', { deviceId: this.deviceId, error: error.message });
      }
    });

    // Disconnected event
    this.client.on('disconnected', async (reason) => {
      try {
        logger.warn('WhatsApp client disconnected', { deviceId: this.deviceId, reason });

        this.isReady = false;

        // Update device status
        await Device.findByIdAndUpdate(
          this.deviceId,
          {
            status: 'disconnected',
            errorMessage: reason
          }
        );

        // Emit disconnection
        this.io.of('/device').to(`device:${this.deviceId}`).emit('status_change', {
          deviceId: this.deviceId.toString(),
          status: 'disconnected',
          reason,
          timestamp: new Date()
        });

        // Attempt to reconnect
        this.attemptReconnect();
      } catch (error) {
        logger.error('Disconnected event error', { deviceId: this.deviceId, error: error.message });
      }
    });

    // Auth failure
    this.client.on('auth_failure', async (msg) => {
      try {
        logger.error('WhatsApp auth failure', { deviceId: this.deviceId, message: msg });

        this.isReady = false;

        // Update device status
        await Device.findByIdAndUpdate(
          this.deviceId,
          {
            status: 'auth_failed',
            errorMessage: 'Authentication failed. Please reconnect.'
          }
        );

        // Emit auth failure
        this.io.of('/device').to(`device:${this.deviceId}`).emit('connection_error', {
          deviceId: this.deviceId.toString(),
          error: 'Authentication failed',
          timestamp: new Date()
        });

        // Don't reconnect on auth failure - requires manual intervention
      } catch (error) {
        logger.error('Auth failure event error', { deviceId: this.deviceId, error: error.message });
      }
    });

    // Error event
    this.client.on('error', (error) => {
      logger.error('WhatsApp client error', { deviceId: this.deviceId, error: error.message });
    });
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  async attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnect attempts reached', { deviceId: this.deviceId });

      await Device.findByIdAndUpdate(
        this.deviceId,
        {
          status: 'disconnected',
          errorMessage: 'Max reconnection attempts reached. Please reconnect manually.'
        }
      );

      this.io.of('/device').to(`device:${this.deviceId}`).emit('connection_error', {
        deviceId: this.deviceId.toString(),
        error: 'Unable to reconnect',
        message: 'Please try reconnecting manually',
        timestamp: new Date()
      });

      return;
    }

    this.reconnectAttempts++;
    const backoffDelay = Math.min(
      this.reconnectBackoffInitial * Math.pow(2, this.reconnectAttempts - 1),
      this.reconnectBackoffMax
    );

    logger.info('Scheduling reconnection', {
      deviceId: this.deviceId,
      attempt: this.reconnectAttempts,
      delayMs: backoffDelay
    });

    await Device.findByIdAndUpdate(
      this.deviceId,
      {
        status: 'connecting',
        connectionAttempts: this.reconnectAttempts
      }
    );

    this.io.of('/device').to(`device:${this.deviceId}`).emit('status_change', {
      deviceId: this.deviceId.toString(),
      status: 'connecting',
      attemptNumber: this.reconnectAttempts,
      timestamp: new Date()
    });

    setTimeout(() => {
      if (this.client && !this.isReady) {
        try {
          this.client.initialize();
        } catch (error) {
          logger.error('Reconnection initialization failed', { deviceId: this.deviceId, error: error.message });
        }
      }
    }, backoffDelay);
  }

  /**
   * Send a message
   */
  async sendMessage(phoneNumber, messageText) {
    try {
      if (!this.isReady) {
        throw new Error('Client is not connected');
      }

      const chatId = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@c.us`;
      const response = await this.client.sendMessage(chatId, messageText);

      logger.info('Message sent', {
        deviceId: this.deviceId,
        to: phoneNumber,
        messageId: response.id.id
      });

      return {
        success: true,
        whatsappMessageId: response.id.id,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Failed to send message', {
        deviceId: this.deviceId,
        to: phoneNumber,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Disconnect the client
   */
  async disconnect() {
    try {
      if (this.qrTimeout) clearTimeout(this.qrTimeout);

      if (this.client) {
        await this.client.destroy();
        logger.info('WhatsApp client disconnected', { deviceId: this.deviceId });
      }

      this.isReady = false;
      this.client = null;
    } catch (error) {
      logger.error('Failed to disconnect client', { deviceId: this.deviceId, error: error.message });
    }
  }

  /**
   * Check if client is ready and connected
   */
  getStatus() {
    return {
      deviceId: this.deviceId.toString(),
      isReady: this.isReady,
      reconnectAttempts: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts
    };
  }
}

module.exports = ClientInstance;
