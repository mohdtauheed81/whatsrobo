const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const logger = require('../config/logger');

// Get all auto-reply rules for company
router.get('/', authenticate, async (req, res) => {
  try {
    const AutoReplyRule = require('../models/AutoReplyRule');
    const rules = await AutoReplyRule.find({ companyId: req.companyId })
      .sort({ priority: -1, createdAt: -1 })
      .populate('deviceId', 'name phoneNumber');

    res.json({
      success: true,
      rules: rules
    });
  } catch (error) {
    logger.error('Get auto-reply rules error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch auto-reply rules' });
  }
});

// Get single rule
router.get('/:ruleId', authenticate, async (req, res) => {
  try {
    const AutoReplyRule = require('../models/AutoReplyRule');
    const rule = await AutoReplyRule.findOne({
      _id: req.params.ruleId,
      companyId: req.companyId
    });

    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    res.json({
      success: true,
      rule: rule
    });
  } catch (error) {
    logger.error('Get rule error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch rule' });
  }
});

// Create new rule
router.post('/', authenticate, async (req, res) => {
  try {
    const AutoReplyRule = require('../models/AutoReplyRule');
    const { deviceId, name, description, triggerType, keywords, pattern, responseType, responseMessage } = req.body;

    if (!deviceId || !name || !triggerType || !responseType || !responseMessage) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const rule = await AutoReplyRule.create({
      companyId: req.companyId,
      deviceId,
      name,
      description,
      triggerType,
      keywords: keywords || [],
      pattern,
      responseType,
      responseMessage
    });

    logger.info('Auto-reply rule created', { ruleId: rule._id, companyId: req.companyId });

    res.status(201).json({
      success: true,
      message: 'Rule created successfully',
      rule: rule
    });
  } catch (error) {
    logger.error('Create rule error', { error: error.message });
    res.status(500).json({ error: 'Failed to create rule' });
  }
});

// Update rule
router.put('/:ruleId', authenticate, async (req, res) => {
  try {
    const AutoReplyRule = require('../models/AutoReplyRule');
    const rule = await AutoReplyRule.findOne({
      _id: req.params.ruleId,
      companyId: req.companyId
    });

    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    Object.assign(rule, req.body);
    await rule.save();

    logger.info('Auto-reply rule updated', { ruleId: rule._id });

    res.json({
      success: true,
      message: 'Rule updated successfully',
      rule: rule
    });
  } catch (error) {
    logger.error('Update rule error', { error: error.message });
    res.status(500).json({ error: 'Failed to update rule' });
  }
});

// Delete rule
router.delete('/:ruleId', authenticate, async (req, res) => {
  try {
    const AutoReplyRule = require('../models/AutoReplyRule');
    const rule = await AutoReplyRule.findOneAndDelete({
      _id: req.params.ruleId,
      companyId: req.companyId
    });

    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    logger.info('Auto-reply rule deleted', { ruleId: rule._id });

    res.json({
      success: true,
      message: 'Rule deleted successfully'
    });
  } catch (error) {
    logger.error('Delete rule error', { error: error.message });
    res.status(500).json({ error: 'Failed to delete rule' });
  }
});

// Test rule with message
router.post('/:ruleId/test', authenticate, async (req, res) => {
  try {
    const AutoReplyRule = require('../models/AutoReplyRule');
    const { testMessage } = req.body;

    if (!testMessage) {
      return res.status(400).json({ error: 'testMessage is required' });
    }

    const rule = await AutoReplyRule.findOne({
      _id: req.params.ruleId,
      companyId: req.companyId
    });

    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    // Test matching
    let triggered = false;
    let response = '';

    if (rule.triggerType === 'keyword') {
      const keywords = rule.keywords || [];
      const matcher = rule.caseSensitive ? testMessage : testMessage.toLowerCase();
      triggered = keywords.some(kw => 
        rule.caseSensitive ? matcher.includes(kw) : matcher.includes(kw.toLowerCase())
      );
      response = rule.responseMessage;
    } else if (rule.triggerType === 'regex') {
      const regex = new RegExp(rule.pattern, rule.caseSensitive ? 'g' : 'gi');
      triggered = regex.test(testMessage);
      response = rule.responseMessage;
    } else if (rule.triggerType === 'always') {
      triggered = true;
      response = rule.responseMessage;
    }

    res.json({
      success: true,
      triggered,
      response,
      message: triggered ? 'Rule would trigger for this message' : 'Rule would NOT trigger'
    });
  } catch (error) {
    logger.error('Test rule error', { error: error.message });
    res.status(500).json({ error: 'Failed to test rule' });
  }
});

module.exports = router;
