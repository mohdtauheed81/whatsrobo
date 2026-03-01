const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
      required: true
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true
    },
    whatsappMessageId: String,
    sender: {
      type: String,
      enum: ['contact', 'company'],
      required: true
    },
    senderPhoneNumber: String,
    messageText: {
      type: String,
      required: true
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'document', 'video', 'audio', 'sticker'],
      default: 'text'
    },
    mediaUrl: String,
    mediaType: String,
    mediaCaption: String,
    status: {
      type: String,
      enum: ['received', 'sent', 'delivered', 'read', 'failed'],
      default: 'received'
    },
    isRead: {
      type: Boolean,
      default: false
    },
    readAt: Date,
    quotedMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatMessage'
    },
    reactions: [{
      emoji: String,
      count: Number
    }],
    metadata: {
      latitude: Number,
      longitude: Number,
      duration: Number
    }
  },
  {
    timestamps: true
  }
);

// Indexes
chatMessageSchema.index({ chatId: 1, createdAt: -1 });
chatMessageSchema.index({ companyId: 1, createdAt: -1 });
chatMessageSchema.index({ isRead: 1, createdAt: -1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
