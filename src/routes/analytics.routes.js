const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const AnalyticsService = require('../services/analytics/AnalyticsService');
const logger = require('../config/logger');

/**
 * GET /api/analytics/dashboard
 * Full analytics dashboard for the authenticated company
 * Query: ?days=30 (default 30, max 365)
 */
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 30, 365);
    const data = await AnalyticsService.getDashboard(req.companyId, days);
    res.json({ success: true, analytics: data });
  } catch (error) {
    logger.error('Analytics dashboard error', { error: error.message, companyId: req.companyId });
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

/**
 * GET /api/analytics/messages/volume
 * Message volume by day
 * Query: ?days=30
 */
router.get('/messages/volume', authenticate, async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 30, 365);
    const data = await AnalyticsService.getMessageVolumeByDay(req.companyId, days);
    res.json({ success: true, days, data });
  } catch (error) {
    logger.error('Message volume analytics error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch message volume' });
  }
});

/**
 * GET /api/analytics/messages/status
 * Message delivery status breakdown
 * Query: ?days=30
 */
router.get('/messages/status', authenticate, async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 30, 365);
    const data = await AnalyticsService.getMessageStatusBreakdown(req.companyId, days);
    res.json({ success: true, days, data });
  } catch (error) {
    logger.error('Message status analytics error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch status breakdown' });
  }
});

/**
 * GET /api/analytics/messages/by-hour
 * Hourly message distribution (best time to send analysis)
 * Query: ?days=30
 */
router.get('/messages/by-hour', authenticate, async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 30, 365);
    const data = await AnalyticsService.getMessagesByHour(req.companyId, days);
    res.json({ success: true, days, data });
  } catch (error) {
    logger.error('Messages by hour analytics error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch hourly distribution' });
  }
});

/**
 * GET /api/analytics/devices
 * Per-device performance stats
 */
router.get('/devices', authenticate, async (req, res) => {
  try {
    const data = await AnalyticsService.getDeviceStats(req.companyId);
    res.json({ success: true, devices: data });
  } catch (error) {
    logger.error('Device analytics error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch device stats' });
  }
});

/**
 * GET /api/analytics/autoreply
 * Auto-reply rule effectiveness
 */
router.get('/autoreply', authenticate, async (req, res) => {
  try {
    const data = await AnalyticsService.getAutoReplyStats(req.companyId);
    res.json({ success: true, rules: data });
  } catch (error) {
    logger.error('Auto-reply analytics error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch auto-reply stats' });
  }
});

/**
 * GET /api/analytics/usage
 * Current plan usage vs limits
 */
router.get('/usage', authenticate, async (req, res) => {
  try {
    const data = await AnalyticsService.getUsageSummary(req.companyId);
    res.json({ success: true, usage: data });
  } catch (error) {
    logger.error('Usage analytics error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch usage summary' });
  }
});

module.exports = router;
