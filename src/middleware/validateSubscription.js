const Company = require('../models/Company');
const Device = require('../models/Device');
const logger = require('../config/logger');

// Middleware to check if subscription is active
const checkSubscriptionActive = async (req, res, next) => {
  try {
    const company = await Company.findById(req.companyId).populate('subscriptionPlan');

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const now = new Date();
    if (company.subscriptionEndDate < now) {
      company.isSubscriptionActive = false;
      await company.save();
      return res.status(403).json({
        error: 'Subscription expired',
        message: `Your subscription ended on ${company.subscriptionEndDate.toDateString()}`
      });
    }

    company.isSubscriptionActive = true;
    req.company = company;
    next();
  } catch (error) {
    logger.error('Subscription check failed', { error: error.message });
    res.status(500).json({ error: 'Subscription validation failed' });
  }
};

// Middleware to check if company can create a new device
const canCreateDevice = async (req, res, next) => {
  try {
    const company = req.company || await Company.findById(req.companyId).populate('subscriptionPlan');

    // Count existing devices
    const deviceCount = await Device.countDocuments({
      companyId: req.companyId,
      isActive: true
    });

    if (deviceCount >= company.subscriptionPlan.maxDevices) {
      return res.status(403).json({
        error: 'Device limit reached',
        message: `Your ${company.subscriptionPlan.name} plan allows maximum ${company.subscriptionPlan.maxDevices} device(s)`
      });
    }

    req.company = company;
    next();
  } catch (error) {
    logger.error('Device limit check failed', { error: error.message });
    res.status(500).json({ error: 'Device validation failed' });
  }
};

// Middleware to check if company can send messages
const canSendMessages = async (req, res, next) => {
  try {
    const company = req.company || await Company.findById(req.companyId).populate('subscriptionPlan');

    // Check if subscription is active
    const now = new Date();
    if (company.subscriptionEndDate < now) {
      return res.status(403).json({
        error: 'Subscription expired',
        message: 'Please renew your subscription to send messages'
      });
    }

    // Check monthly message limit
    const { usageStats, subscriptionPlan } = company;
    if (usageStats.messagesThisMonth >= subscriptionPlan.monthlyMessageLimit) {
      return res.status(403).json({
        error: 'Monthly limit reached',
        message: `You have reached your monthly limit of ${subscriptionPlan.monthlyMessageLimit} messages`,
        usage: {
          sent: usageStats.messagesThisMonth,
          limit: subscriptionPlan.monthlyMessageLimit
        }
      });
    }

    req.company = company;
    next();
  } catch (error) {
    logger.error('Message limit check failed', { error: error.message });
    res.status(500).json({ error: 'Message validation failed' });
  }
};

// Middleware to check feature access
const checkFeatureAccess = (feature) => {
  return async (req, res, next) => {
    try {
      const company = req.company || await Company.findById(req.companyId).populate('subscriptionPlan');

      if (!company.subscriptionPlan.features.includes(feature)) {
        return res.status(403).json({
          error: 'Feature not available',
          message: `The ${feature.replace(/_/g, ' ')} feature is not available in your ${company.subscriptionPlan.name} plan`
        });
      }

      req.company = company;
      next();
    } catch (error) {
      logger.error('Feature check failed', { error: error.message });
      res.status(500).json({ error: 'Feature validation failed' });
    }
  };
};

module.exports = {
  checkSubscriptionActive,
  canCreateDevice,
  canSendMessages,
  checkFeatureAccess
};
