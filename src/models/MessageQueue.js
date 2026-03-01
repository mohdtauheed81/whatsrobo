const mongoose = require('mongoose');

const messageQueueSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true
    },
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'retry'],
      default: 'pending'
    },
    priority: {
      type: Number,
      default: 0,
      min: -10,
      max: 10
    },
    rateLimit: {
      tokensAvailable: {
        type: Number,
        default: 20
      },
      lastRefillTime: {
        type: Date,
        default: Date.now
      },
      messagesPerMinute: {
        type: Number,
        default: 20
      },
      minimumDelayBetweenMessages: {
        type: Number,
        default: 1000
      }
    },
    attempts: {
      count: {
        type: Number,
        default: 0,
        min: 0
      },
      maxAttempts: {
        type: Number,
        default: 3
      },
      lastAttemptAt: Date,
      nextRetryAt: Date
    },
    processingStartedAt: Date,
    completedAt: Date,
    error: String,
    metadata: {
      bulkBatchId: String,
      estimatedWaitTime: Number,
      globalQueuePosition: Number
    }
  },
  {
    timestamps: true
  }
);

// Indexes
messageQueueSchema.index({ companyId: 1, status: 1 });
messageQueueSchema.index({ status: 1, 'attempts.nextRetryAt': 1 });
messageQueueSchema.index({ createdAt: 1 });

module.exports = mongoose.model('MessageQueue', messageQueueSchema);
