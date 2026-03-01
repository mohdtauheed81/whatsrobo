const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../middleware/auth');
const logger = require('../config/logger');
const { getMessageQueueService } = require('../services/messaging/MessageQueue');

// Configure multer for Excel uploads
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, 'bulk_' + Date.now() + ext);
  }
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['.xlsx', '.xls'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Only Excel files are allowed'));
  },
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Get all messages for company (requires auth)
router.get('/', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const Message = require('../models/Message');
    const skip = (page - 1) * limit;

    const messages = await Message.find({ companyId: req.companyId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('deviceId')
      .exec();

    const total = await Message.countDocuments({ companyId: req.companyId });

    res.json({
      success: true,
      messages,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    logger.error('Get messages error', { error: error.message, companyId: req.companyId });
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send single message (requires auth)
router.post('/send', authenticate, async (req, res) => {
  try {
    const { deviceId, recipientNumber, phoneNumber, to, message } = req.body;
    // Accept multiple field name conventions from different clients
    const recipient = recipientNumber || phoneNumber || to;
    if (!deviceId || !recipient || !message) {
      return res.status(400).json({ error: 'deviceId, recipientNumber, and message are required' });
    }
    const messageQueue = getMessageQueueService();
    const job = await messageQueue.addMessage(req.companyId, { deviceId, phoneNumber: recipient, message, type: 'text', source: 'manual' });
    res.json({ success: true, message: 'Message queued successfully', jobId: job.jobId, messageId: job.messageId });
  } catch (error) {
    logger.error('Send message error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to send message', detail: error.message });
  }
});

// Download Excel template
router.get('/bulk/template/download', authenticate, async (req, res) => {
  try {
    const ExcelParser = require('../utils/excelParser');
    const templatePath = path.join(process.cwd(), 'uploads', 'template.xlsx');
    await ExcelParser.createTemplateFile(templatePath);
    res.download(templatePath, 'bulk_message_template.xlsx');
  } catch (error) {
    logger.error('Template download error', { error: error.message });
    res.status(500).json({ error: 'Failed to generate template' });
  }
});

// Get bulk jobs for company
router.get('/bulk/jobs', authenticate, async (req, res) => {
  try {
    const BulkMessage = require('../models/BulkMessage');
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const jobs = await BulkMessage.find({ companyId: req.companyId })
      .sort({ createdAt: -1 }).skip(skip).limit(limit)
      .populate('deviceId', 'name phoneNumber');
    const total = await BulkMessage.countDocuments({ companyId: req.companyId });
    res.json({ success: true, jobs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    logger.error('Get bulk jobs error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch bulk jobs' });
  }
});

// Bulk upload - upload Excel file and queue messages
router.post('/bulk/upload', authenticate, upload.single('file'), async (req, res) => {
  let filePath = null;
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Excel file is required' });
    }
    const { deviceId, batchName } = req.body;
    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' });
    }
    filePath = req.file.path;

    const Device = require('../models/Device');
    const device = await Device.findOne({ _id: deviceId, companyId: req.companyId });
    if (!device) return res.status(404).json({ error: 'Device not found' });
    if (device.status !== 'connected') return res.status(400).json({ error: 'Device must be connected to send messages' });

    const ExcelParser = require('../utils/excelParser');
    const parseResult = await ExcelParser.parseContactsFromFile(filePath);
    if (!parseResult.success || parseResult.contacts.length === 0) {
      return res.status(400).json({ error: 'No valid contacts found in file', details: parseResult.errors });
    }

    const messageTemplate = req.body.messageTemplate || parseResult.contacts[0].message;
    const BulkMessageHandler = require('../services/messaging/BulkMessageHandler');
    const messageQueue = getMessageQueueService();

    const batch = await BulkMessageHandler.createBulkBatch(req.companyId, deviceId, {
      batchName: batchName || req.file.originalname,
      fileName: req.file.originalname,
      contacts: parseResult.contacts,
      messageTemplate,
      settings: {}
    }, messageQueue);

    fs.unlink(filePath, () => {});

    res.status(201).json({
      success: true,
      message: 'Bulk job created: ' + parseResult.contacts.length + ' messages queued',
      batch: { _id: batch._id, batchName: batch.batchName, totalContacts: batch.totalContacts, status: batch.status },
      summary: parseResult.summary
    });
  } catch (error) {
    if (filePath) fs.unlink(filePath, () => {});
    logger.error('Bulk upload error', { error: error.message, companyId: req.companyId });
    res.status(500).json({ error: error.message || 'Failed to process bulk upload' });
  }
});

// Get bulk job status by ID
router.get('/bulk/:batchId', authenticate, async (req, res) => {
  try {
    const BulkMessage = require('../models/BulkMessage');
    const batch = await BulkMessage.findOne({ _id: req.params.batchId, companyId: req.companyId })
      .populate('deviceId', 'name phoneNumber');
    if (!batch) return res.status(404).json({ error: 'Bulk job not found' });
    res.json({ success: true, batch });
  } catch (error) {
    logger.error('Get bulk job error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch bulk job' });
  }
});

// Get queue status (requires auth)
router.get('/queue/status', authenticate, async (req, res) => {
  try {
    const messageQueue = getMessageQueueService();
    const status = await messageQueue.getQueueStatus(req.companyId);
    res.json({ success: true, status });
  } catch (error) {
    logger.error('Get queue status error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch queue status' });
  }
});

// Get single message by ID (requires auth)
router.get('/:messageId', authenticate, async (req, res) => {
  try {
    const Message = require('../models/Message');
    const message = await Message.findOne({ _id: req.params.messageId, companyId: req.companyId });
    if (!message) return res.status(404).json({ error: 'Message not found' });
    res.json({ success: true, message });
  } catch (error) {
    logger.error('Get message error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch message' });
  }
});

module.exports = router;
