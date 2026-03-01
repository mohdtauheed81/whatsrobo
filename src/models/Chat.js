const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema(
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
    whatsappChatId: {
      type: String,
      required: true
    },
    contactPhoneNumber: {
      type: String,
      required: true,
      match: /^[\d\+\-\s\(\)]+$/
    },
    contactName: String,
    contactProfilePicUrl: String,
    lastMessage: String,
    lastMessageTime: Date,
    unreadCount: {
      type: Number,
      default: 0,
      min: 0
    },
    isArchived: {
      type: Boolean,
      default: false
    },
    isMuted: {
      type: Boolean,
      default: false
    },
    tags: [String],
    customFields: mongoose.Schema.Types.Mixed,
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes
chatSchema.index({ companyId: 1, updatedAt: -1 });
chatSchema.index({ deviceId: 1, isArchived: 1 });
chatSchema.index({ whatsappChatId: 1 });
chatSchema.index({ contactPhoneNumber: 1 });

module.exports = mongoose.model('Chat', chatSchema);
