const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      enum: ['Starter', 'Professional', 'Enterprise']
    },
    description: String,
    price: {
      type: Number,
      required: true,
      min: 0
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'monthly'
    },
    maxDevices: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    monthlyMessageLimit: {
      type: Number,
      required: true,
      min: 1000
    },
    messagesPerMinute: {
      type: Number,
      default: 20
    },
    features: {
      type: [String],
      default: [],
      enum: ['manual_messaging', 'bulk_messaging', 'auto_reply', 'api_access', 'advanced_analytics']
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
