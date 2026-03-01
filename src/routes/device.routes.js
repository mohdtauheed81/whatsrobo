const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getWhatsAppManager } = require('../services/whatsapp/WhatsAppManager');
const logger = require('../config/logger');

// Get all devices for company (requires auth)
router.get('/', authenticate, async (req, res) => {
  try {
    const whatsAppManager = getWhatsAppManager();
    const devices = await whatsAppManager.getDevicesByCompany(req.companyId);

    res.json({
      success: true,
      devices: devices,
      total: devices.length
    });
  } catch (error) {
    logger.error('Get devices error', { error: error.message, companyId: req.companyId });
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

// Get single device (requires auth)
router.get('/:deviceId', authenticate, async (req, res) => {
  try {
    const whatsAppManager = getWhatsAppManager();
    const device = await whatsAppManager.getDevice(req.params.deviceId, req.companyId);

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    res.json({
      success: true,
      device: device
    });
  } catch (error) {
    logger.error('Get device error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch device' });
  }
});

// Create new device (requires auth)
router.post('/', authenticate, async (req, res) => {
  try {
    const { name } = req.body;
    const whatsAppManager = getWhatsAppManager();
    const device = await whatsAppManager.createDevice(req.companyId, name);

    res.status(201).json({
      success: true,
      message: 'Device created successfully',
      device: device
    });
  } catch (error) {
    logger.error('Create device error', { error: error.message, companyId: req.companyId });
    res.status(500).json({ error: error.message || 'Failed to create device' });
  }
});

// Disconnect device (requires auth)
router.post('/:deviceId/disconnect', authenticate, async (req, res) => {
  try {
    const whatsAppManager = getWhatsAppManager();
    await whatsAppManager.disconnectDevice(req.params.deviceId, req.companyId);

    res.json({
      success: true,
      message: 'Device disconnected successfully'
    });
  } catch (error) {
    logger.error('Disconnect device error', { error: error.message });
    res.status(500).json({ error: 'Failed to disconnect device' });
  }
});

// Delete device (requires auth)
router.delete('/:deviceId', authenticate, async (req, res) => {
  try {
    const whatsAppManager = getWhatsAppManager();
    await whatsAppManager.deleteDevice(req.params.deviceId, req.companyId);

    res.json({
      success: true,
      message: 'Device deleted successfully'
    });
  } catch (error) {
    logger.error('Delete device error', { error: error.message });
    res.status(500).json({ error: 'Failed to delete device' });
  }
});

// Initiate device connection (generates QR code)
router.post('/:deviceId/connect', authenticate, async (req, res) => {
  try {
    const Device = require('../models/Device');
    const whatsAppManager = getWhatsAppManager();
    const io = req.app.locals.io;

    // Verify device belongs to company
    const device = await Device.findOne({ _id: req.params.deviceId, companyId: req.companyId });
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Get or create client (this will trigger QR code generation)
    const client = await whatsAppManager.getOrCreateClient(req.params.deviceId, io);

    // Poll for QR code with retry logic (up to 10 seconds)
    let updatedDevice = null;
    let qrReady = false;
    const maxRetries = 20; // 20 attempts
    const retryInterval = 500; // 500ms between retries

    for (let i = 0; i < maxRetries; i++) {
      await new Promise(resolve => setTimeout(resolve, retryInterval));
      updatedDevice = await Device.findById(req.params.deviceId);

      if (updatedDevice && updatedDevice.qrCodeUrl) {
        logger.info('QR code found', { deviceId: req.params.deviceId, attempt: i + 1 });
        qrReady = true;
        break;
      }
    }

    if (!updatedDevice) {
      return res.status(500).json({ error: 'Device not found during QR generation' });
    }

    logger.info('QR code response', {
      deviceId: req.params.deviceId,
      hasQR: !!updatedDevice.qrCodeUrl,
      status: updatedDevice.status
    });

    res.json({
      success: true,
      message: 'Device connection initiated. Scan QR code to connect.',
      device: {
        _id: device._id,
        name: device.name,
        status: updatedDevice.status,
        qrCodeUrl: updatedDevice.qrCodeUrl || null // Include QR in response!
      }
    });
  } catch (error) {
    logger.error('Connect device error', { error: error.message, deviceId: req.params.deviceId });
    res.status(500).json({ error: error.message || 'Failed to connect device' });
  }
});

// Send message through device
router.post('/:deviceId/send-message', authenticate, async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({ error: 'phoneNumber and message are required' });
    }

    const Device = require('../models/Device');
    const whatsAppManager = getWhatsAppManager();

    // Verify device belongs to company
    const device = await Device.findOne({ _id: req.params.deviceId, companyId: req.companyId });
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Send message
    const result = await whatsAppManager.sendMessage(req.params.deviceId, phoneNumber, message);

    res.json({
      success: true,
      message: 'Message sent successfully',
      result: result
    });
  } catch (error) {
    logger.error('Send message error', { error: error.message });
    res.status(500).json({ error: error.message || 'Failed to send message' });
  }
});

module.exports = router;
