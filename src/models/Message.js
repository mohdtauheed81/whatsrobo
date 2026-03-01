const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true
    },
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device',
      required: true
    },
    recipient: {
      type: String,
      required: true,
      match: /^[\d\+\-\s\(\)]+$/
    },
    messageText: {
      type: String,
      required: true
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'document', 'otp', 'bulk', 'auto_reply'],
      default: 'text'
    },
    status: {
      type: String,
      enum: ['pending', 'queued', 'sent', 'delivered', 'read', 'failed'],
      default: 'pending'
    },
    bulkBatchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BulkMessage'
    },
    whatsappMessageId: String,
    mediaUrl: String,
    mediaType: {
      type: String,
      enum: ['image', 'document', 'video', 'audio'],
      sparse: true
    },
    errorMessage: String,
    sentAt: Date,
    deliveredAt: Date,
    readAt: Date,
    retryCount: {
      type: Number,
      default: 0,
      max: 3
    },
    metadata: {
      source: {
        type: String,
        enum: ['manual', 'bulk', 'auto_reply', 'api'],
        default: 'manual'
      },
      campaignId: String,
      conversationId: String
    }
  },
  {
    timestamps: true,
    indexes: [
      { companyId: 1, createdAt: -1 },
      { deviceId: 1, status: 1 },
      { recipient: 1, createdAt: -1 },
      { bulkBatchId: 1 },
      { status: 1, retryCount: 1 }
    ]
  }
);

module.exports = mongoose.model('Message', messageSchema);
