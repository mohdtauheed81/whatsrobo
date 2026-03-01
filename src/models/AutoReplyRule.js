const mongoose = require('mongoose');

const autoReplyRuleSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true
    },
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true
    },
    description: String,

    // Trigger settings
    triggerType: {
      type: String,
      enum: ['keyword', 'regex', 'always', 'business_hours', 'off_hours'],
      default: 'keyword'
    },
    keywords: [String],
    pattern: String,
    caseSensitive: {
      type: Boolean,
      default: false
    },

    // Response settings
    responseType: {
      type: String,
      enum: ['fixed', 'template', 'ai_generated'],
      default: 'fixed'
    },
    responseMessage: String,
    template: String,
    aiPrompt: String,

    // Advanced options
    priority: {
      type: Number,
      default: 0,
      index: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },

    // Restrictions
    respondOnce: {
      type: Boolean,
      default: false
    },
    excludeContacts: [String],
    respondOnlyToNewContacts: {
      type: Boolean,
      default: false
    },

    // Rate limiting
    maxResponsesPerDay: Number,
    delayBeforeResponse: Number,

    // Analytics
    timesTriggered: {
      type: Number,
      default: 0
    },
    lastTriggered: Date
  },
  {
    timestamps: true
  }
);

autoReplyRuleSchema.index({ companyId: 1, isActive: 1 });
autoReplyRuleSchema.index({ deviceId: 1, isActive: 1 });

module.exports = mongoose.model('AutoReplyRule', autoReplyRuleSchema);
