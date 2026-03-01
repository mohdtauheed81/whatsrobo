const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const logger = require('../config/logger');

// Get all chats for company
router.get('/', authenticate, async (req, res) => {
  try {
    const Chat = require('../models/Chat');

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const chats = await Chat.find({ companyId: req.companyId })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('deviceId', 'name phoneNumber')
      .exec();

    const total = await Chat.countDocuments({ companyId: req.companyId });

    res.json({
      success: true,
      chats: chats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get chats error', { error: error.message, companyId: req.companyId });
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
});

// Get chat messages
router.get('/:chatId/messages', authenticate, async (req, res) => {
  try {
    const Chat = require('../models/Chat');
    const ChatMessage = require('../models/ChatMessage');

    // Verify chat belongs to company
    const chat = await Chat.findOne({ _id: req.params.chatId, companyId: req.companyId });
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const messages = await ChatMessage.find({ chatId: req.params.chatId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    const total = await ChatMessage.countDocuments({ chatId: req.params.chatId });

    res.json({
      success: true,
      messages: messages.reverse(), // Reverse to show oldest first
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get chat messages error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch chat messages' });
  }
});

// Send message in chat
router.post('/:chatId/messages', authenticate, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    const Chat = require('../models/Chat');
    const ChatMessage = require('../models/ChatMessage');

    // Verify chat belongs to company
    const chat = await Chat.findOne({ _id: req.params.chatId, companyId: req.companyId });
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Create and send message
    const { getWhatsAppManager } = require('../services/whatsapp/WhatsAppManager');
    const whatsAppManager = getWhatsAppManager();

    const result = await whatsAppManager.sendMessage(
      chat.deviceId,
      chat.contactPhoneNumber,
      message
    );

    // Save message to chat history
    const chatMessage = await ChatMessage.create({
      chatId: req.params.chatId,
      senderId: req.companyId,
      senderType: 'company',
      message,
      whatsappMessageId: result.whatsappMessageId,
      status: 'sent'
    });

    res.json({
      success: true,
      message: 'Message sent',
      data: chatMessage
    });
  } catch (error) {
    logger.error('Send chat message error', { error: error.message });
    res.status(500).json({ error: error.message || 'Failed to send message' });
  }
});

// Archive chat
router.post('/:chatId/archive', authenticate, async (req, res) => {
  try {
    const Chat = require('../models/Chat');

    // Verify chat belongs to company
    const chat = await Chat.findOne({ _id: req.params.chatId, companyId: req.companyId });
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Archive chat
    chat.isArchived = true;
    await chat.save();

    res.json({
      success: true,
      message: 'Chat archived',
      data: chat
    });
  } catch (error) {
    logger.error('Archive chat error', { error: error.message });
    res.status(500).json({ error: 'Failed to archive chat' });
  }
});

module.exports = router;
