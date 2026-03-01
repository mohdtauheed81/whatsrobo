const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const logger = require('../config/logger');

/**
 * GET /api/gdpr/export
 * Export all personal data for the authenticated company (GDPR Article 20 - Data Portability)
 */
router.get('/export', authenticate, async (req, res) => {
  try {
    const Company = require('../models/Company');
    const Device = require('../models/Device');
    const Message = require('../models/Message');
    const Chat = require('../models/Chat');
    const ChatMessage = require('../models/ChatMessage');
    const AutoReplyRule = require('../models/AutoReplyRule');
    const Invoice = require('../models/Invoice');
    const BulkMessage = require('../models/BulkMessage');

    const companyId = req.companyId;

    const [company, devices, messages, chats, chatMessages, autoReplies, invoices, bulkMessages] = await Promise.all([
      Company.findById(companyId).select('-password -googleId -stripeCustomerId').lean(),
      Device.find({ companyId }).lean(),
      Message.find({ companyId }).lean(),
      Chat.find({ companyId }).lean(),
      ChatMessage.find({ companyId }).lean(),
      AutoReplyRule.find({ companyId }).lean(),
      Invoice.find({ companyId }).lean(),
      BulkMessage.find({ companyId }).lean()
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      gdprNote: 'This export contains all personal data held for your account under GDPR Article 20.',
      company: {
        companyName: company.companyName,
        email: company.email,
        phoneNumber: company.phoneNumber,
        createdAt: company.createdAt,
        subscription: {
          startDate: company.subscriptionStartDate,
          endDate: company.subscriptionEndDate,
          isActive: company.isSubscriptionActive
        },
        usageStats: company.usageStats
      },
      devices: devices.map(d => ({
        name: d.name,
        phoneNumber: d.phoneNumber,
        status: d.status,
        createdAt: d.createdAt
      })),
      messages: messages.map(m => ({
        recipientNumber: m.recipientNumber,
        message: m.message,
        status: m.status,
        sentAt: m.createdAt
      })),
      chats: chats.map(c => ({
        contactName: c.contactName,
        contactNumber: c.contactNumber,
        createdAt: c.createdAt
      })),
      chatMessages: chatMessages.map(cm => ({
        body: cm.body,
        fromMe: cm.fromMe,
        timestamp: cm.timestamp
      })),
      autoReplyRules: autoReplies.map(r => ({
        name: r.name,
        trigger: r.trigger,
        triggerType: r.triggerType,
        response: r.response,
        isActive: r.isActive
      })),
      invoices: invoices.map(i => ({
        invoiceNumber: i.invoiceNumber,
        amount: i.amount,
        status: i.status,
        createdAt: i.createdAt
      })),
      bulkMessages: bulkMessages.map(b => ({
        name: b.name,
        totalContacts: b.totalContacts,
        status: b.status,
        createdAt: b.createdAt
      }))
    };

    logger.info('GDPR data export requested', { companyId });

    res.setHeader('Content-Disposition', `attachment; filename="gdpr-export-${companyId}.json"`);
    res.setHeader('Content-Type', 'application/json');
    return res.json(exportData);
  } catch (error) {
    logger.error('GDPR export error', { error: error.message, companyId: req.companyId });
    res.status(500).json({ error: 'Failed to export data' });
  }
});

/**
 * POST /api/gdpr/consent
 * Record or update GDPR consent (Article 7 - Conditions for consent)
 */
router.post('/consent', authenticate, async (req, res) => {
  try {
    const { consentTypes, consentGiven } = req.body;
    if (!Array.isArray(consentTypes) || consentTypes.length === 0) {
      return res.status(400).json({ error: 'consentTypes array is required' });
    }

    const validTypes = ['marketing', 'analytics', 'thirdParty'];
    const invalid = consentTypes.filter(t => !validTypes.includes(t));
    if (invalid.length > 0) {
      return res.status(400).json({ error: `Invalid consent types: ${invalid.join(', ')}. Valid: ${validTypes.join(', ')}` });
    }

    const Company = require('../models/Company');
    const consentRecord = {
      givenAt: new Date(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      types: consentTypes,
      given: consentGiven !== false // default true
    };

    await Company.findByIdAndUpdate(req.companyId, {
      $push: { gdprConsentLog: consentRecord },
      $set: { gdprConsentUpdatedAt: new Date() }
    });

    logger.info('GDPR consent recorded', { companyId: req.companyId, consentTypes, consentGiven });
    res.json({ success: true, message: 'Consent recorded', consent: consentRecord });
  } catch (error) {
    logger.error('GDPR consent error', { error: error.message });
    res.status(500).json({ error: 'Failed to record consent' });
  }
});

/**
 * DELETE /api/gdpr/delete
 * Anonymize and delete all personal data (GDPR Article 17 - Right to Erasure)
 * This is a destructive, irreversible operation. Requires password confirmation.
 */
router.delete('/delete', authenticate, async (req, res) => {
  try {
    const { confirmPassword } = req.body;
    if (!confirmPassword) {
      return res.status(400).json({ error: 'Password confirmation required to delete account data' });
    }

    const Company = require('../models/Company');
    const Device = require('../models/Device');
    const Message = require('../models/Message');
    const Chat = require('../models/Chat');
    const ChatMessage = require('../models/ChatMessage');
    const AutoReplyRule = require('../models/AutoReplyRule');
    const BulkMessage = require('../models/BulkMessage');
    const bcrypt = require('bcryptjs');

    const companyId = req.companyId;
    const company = await Company.findById(companyId);
    if (!company) return res.status(404).json({ error: 'Company not found' });

    // Verify password before deletion
    const valid = await bcrypt.compare(confirmPassword, company.password);
    if (!valid) return res.status(401).json({ error: 'Incorrect password. Account deletion cancelled.' });

    const anonymizedEmail = `deleted_${companyId}@anonymized.gdpr`;

    // Anonymize company record (keep for audit/invoice integrity)
    await Company.findByIdAndUpdate(companyId, {
      $set: {
        companyName: '[Deleted Account]',
        email: anonymizedEmail,
        phoneNumber: null,
        password: 'GDPR_DELETED',
        googleId: null,
        stripeCustomerId: null,
        isSubscriptionActive: false,
        gdprDeletedAt: new Date()
      }
    });

    // Hard-delete operational data
    await Promise.all([
      Device.deleteMany({ companyId }),
      Message.deleteMany({ companyId }),
      Chat.deleteMany({ companyId }),
      ChatMessage.deleteMany({ companyId }),
      AutoReplyRule.deleteMany({ companyId }),
      BulkMessage.deleteMany({ companyId })
    ]);

    logger.info('GDPR account deletion completed', { companyId });

    res.json({
      success: true,
      message: 'All personal data has been deleted. Invoices are retained for legal compliance (7-year requirement).',
      deletedAt: new Date()
    });
  } catch (error) {
    logger.error('GDPR deletion error', { error: error.message, companyId: req.companyId });
    res.status(500).json({ error: 'Failed to delete account data' });
  }
});

/**
 * GET /api/gdpr/consent
 * Get current consent status for the company
 */
router.get('/consent', authenticate, async (req, res) => {
  try {
    const Company = require('../models/Company');
    const company = await Company.findById(req.companyId).select('gdprConsentLog gdprConsentUpdatedAt').lean();
    if (!company) return res.status(404).json({ error: 'Company not found' });

    const latestConsent = company.gdprConsentLog?.slice(-1)[0] || null;
    res.json({
      success: true,
      lastUpdated: company.gdprConsentUpdatedAt || null,
      currentConsent: latestConsent,
      history: company.gdprConsentLog || []
    });
  } catch (error) {
    logger.error('Get GDPR consent error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch consent status' });
  }
});

module.exports = router;
