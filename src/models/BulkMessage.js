const mongoose = require('mongoose');

const bulkMessageSchema = new mongoose.Schema(
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
    batchName: {
      type: String,
      required: true
    },
    fileName: String,
    totalContacts: {
      type: Number,
      required: true,
      min: 1
    },
    messageTemplate: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'pending'
    },
    progress: {
      sent: {
        type: Number,
        default: 0
      },
      delivered: {
        type: Number,
        default: 0
      },
      failed: {
        type: Number,
        default: 0
      },
      pending: {
        type: Number,
        default: 0
      }
    },
    startedAt: Date,
    completedAt: Date,
    estimatedTimeRemaining: Number,
    contacts: [{
      phoneNumber: String,
      name: String,
      status: {
        type: String,
        enum: ['pending', 'sent', 'delivered', 'failed'],
        default: 'pending'
      },
      messageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
      },
      error: String
    }],
    settings: {
      includeTimestamp: {
        type: Boolean,
        default: false
      },
      delayBetweenMessages: {
        type: Number,
        default: 1000,
        min: 500
      },
      retryFailed: {
        type: Boolean,
        default: true
      }
    },
    metadata: {
      uploadedAt: Date,
      campaignId: String,
      source: {
        type: String,
        enum: ['excel', 'csv', 'api', 'manual']
      }
    }
  },
  {
    timestamps: true
  }
);

// Indexes
bulkMessageSchema.index({ companyId: 1, createdAt: -1 });
bulkMessageSchema.index({ deviceId: 1, status: 1 });
bulkMessageSchema.index({ status: 1 });

module.exports = mongoose.model('BulkMessage', bulkMessageSchema);
