const { socketAuthMiddleware } = require('../middleware/auth');
const logger = require('./logger');

/**
 * Configure Socket.IO namespaces and event handlers
 */
const setupSocket = (io) => {
  // Apply authentication middleware to all namespaces
  io.use((socket, next) => {
    socketAuthMiddleware(socket, next);
  });

  // DEVICE NAMESPACE - for QR codes and device status
  const deviceNamespace = io.of('/device');

  deviceNamespace.on('connection', (socket) => {
    logger.info('Device namespace connected', {
      socketId: socket.id,
      companyId: socket.companyId
    });

    // Join company-specific room
    socket.on('subscribe_device', async (data) => {
      const { deviceId } = data;
      const room = `device:${deviceId}`;
      socket.join(room);

      logger.info('Subscribed to device', {
        socketId: socket.id,
        deviceId,
        room
      });

      // Check if device has a stored QR code and send it
      try {
        const Device = require('../models/Device');
        const device = await Device.findById(deviceId);

        if (device && device.qrCodeUrl && device.status === 'qr_pending') {
          logger.info('Sending stored QR code to client', { deviceId });
          socket.emit('qr_code', {
            deviceId: deviceId.toString(),
            qrCode: device.qrCodeUrl,
            timestamp: new Date(),
            expiresIn: 60
          });
        }
      } catch (error) {
        logger.warn('Error fetching stored QR code', { deviceId, error: error.message });
      }

      socket.emit('subscribed', {
        deviceId,
        message: 'Successfully subscribed to device updates'
      });
    });

    // Unsubscribe from device
    socket.on('unsubscribe_device', (data) => {
      const { deviceId } = data;
      const room = `device:${deviceId}`;
      socket.leave(room);

      logger.info('Unsubscribed from device', {
        socketId: socket.id,
        deviceId
      });
    });

    // Request QR code (frontend requesting to show QR again)
    socket.on('request_qr', (data) => {
      const { deviceId } = data;
      // This will be handled by the WhatsApp client
      logger.info('QR requested', { socketId: socket.id, deviceId });
    });

    // Disconnect
    socket.on('disconnect', () => {
      logger.info('Device namespace disconnected', { socketId: socket.id });
    });

    // Error handling
    socket.on('error', (error) => {
      logger.error('Device socket error', { socketId: socket.id, error });
    });
  });

  // CHAT NAMESPACE - for incoming messages and chat updates
  const chatNamespace = io.of('/chat');

  chatNamespace.on('connection', (socket) => {
    logger.info('Chat namespace connected', {
      socketId: socket.id,
      companyId: socket.companyId
    });

    // Subscribe to company chat updates
    socket.on('subscribe_company', (data) => {
      const { companyId } = data || {};
      const room = `company:${socket.companyId || companyId}`;
      socket.join(room);

      logger.info('Subscribed to company chat', {
        socketId: socket.id,
        companyId: room
      });

      socket.emit('subscribed', {
        room,
        message: 'Successfully subscribed to company updates'
      });
    });

    // Subscribe to specific chat
    socket.on('subscribe_chat', (data) => {
      const { chatId } = data;
      const room = `chat:${chatId}`;
      socket.join(room);

      logger.info('Subscribed to chat', {
        socketId: socket.id,
        chatId,
        room
      });

      socket.emit('subscribed', {
        chatId,
        message: 'Successfully subscribed to chat'
      });
    });

    // Unsubscribe from company
    socket.on('unsubscribe_company', (data) => {
      const { companyId } = data || {};
      const room = `company:${socket.companyId || companyId}`;
      socket.leave(room);

      logger.info('Unsubscribed from company', { socketId: socket.id, room });
    });

    // Unsubscribe from chat
    socket.on('unsubscribe_chat', (data) => {
      const { chatId } = data;
      const room = `chat:${chatId}`;
      socket.leave(room);

      logger.info('Unsubscribed from chat', { socketId: socket.id, chatId });
    });

    // Typing indicator
    socket.on('typing', (data) => {
      const { chatId, isTyping } = data;
      const room = `chat:${chatId}`;

      socket.to(room).emit('typing_indicator', {
        chatId,
        isTyping,
        timestamp: new Date()
      });
    });

    // Disconnect
    socket.on('disconnect', () => {
      logger.info('Chat namespace disconnected', { socketId: socket.id });
    });

    // Error handling
    socket.on('error', (error) => {
      logger.error('Chat socket error', { socketId: socket.id, error });
    });
  });

  logger.info('Socket.IO namespaces configured successfully');
};

module.exports = { setupSocket };
