const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const logger = require('../config/logger');

// Admin auth check middleware
const isAdmin = (req, res, next) => {
  if (!req.isAdmin) return res.status(403).json({ error: 'Admin access required' });
  next();
};

// ─────────────────────────────────────────
//  STATS
// ─────────────────────────────────────────
router.get('/stats', authenticate, isAdmin, async (req, res) => {
  try {
    const Company = require('../models/Company');
    const Device = require('../models/Device');
    const Message = require('../models/Message');
    const Invoice = require('../models/Invoice');

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    const SubscriptionPlan = require('../models/SubscriptionPlan');

    const [totalCompanies, activeCompanies, totalDevices, connectedDevices,
      totalMessages, recentMessages, thisMonthMessages, paidInvoices, thisMonthRevenue,
      thisMonthPaidInvoices, pendingInvoicesData, totalPlans, thisMonthNewCompanies] = await Promise.all([
      Company.countDocuments(),
      Company.countDocuments({ isSubscriptionActive: true }),
      Device.countDocuments({ isActive: true }),
      Device.countDocuments({ status: 'connected', isActive: true }),
      Message.countDocuments(),
      Message.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      Message.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Invoice.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, total: { $sum: '$amount.totalAmount' } } }]),
      Invoice.aggregate([{ $match: { status: 'paid', paymentDate: { $gte: startOfMonth } } }, { $group: { _id: null, total: { $sum: '$amount.totalAmount' } } }]),
      Invoice.countDocuments({ status: 'paid', paymentDate: { $gte: startOfMonth } }),
      Invoice.aggregate([{ $match: { status: { $in: ['issued', 'overdue'] } } }, { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$amount.totalAmount' } } }]),
      SubscriptionPlan.countDocuments(),
      Company.countDocuments({ createdAt: { $gte: startOfMonth } }),
    ]);

    res.json({
      success: true,
      stats: {
        totalCompanies, activeCompanies, totalDevices, connectedDevices,
        totalMessages, recentMessages, thisMonthMessages,
        totalRevenue: paidInvoices[0]?.total || 0,
        thisMonthRevenue: thisMonthRevenue[0]?.total || 0,
        thisMonthPaidInvoices,
        pendingInvoices: pendingInvoicesData[0]?.count || 0,
        pendingRevenue: pendingInvoicesData[0]?.total || 0,
        totalPlans,
        thisMonthNewCompanies,
      }
    });
  } catch (error) {
    logger.error('Admin stats error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ─────────────────────────────────────────
//  ANALYTICS  (charts)
// ─────────────────────────────────────────
router.get('/analytics', authenticate, isAdmin, async (req, res) => {
  try {
    const Company = require('../models/Company');
    const Message = require('../models/Message');
    const Invoice = require('../models/Invoice');

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const [revenueByMonth, messagesByDay, companiesGrowth, planDistribution, topCompanies] = await Promise.all([
      Invoice.aggregate([
        { $match: { status: 'paid', paymentDate: { $gte: twelveMonthsAgo } } },
        { $group: { _id: { year: { $year: '$paymentDate' }, month: { $month: '$paymentDate' } }, revenue: { $sum: '$amount.totalAmount' }, count: { $sum: 1 } } },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),
      Message.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      Company.aggregate([
        { $match: { createdAt: { $gte: twelveMonthsAgo } } },
        { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),
      Company.aggregate([
        { $lookup: { from: 'subscriptionplans', localField: 'subscriptionPlan', foreignField: '_id', as: 'plan' } },
        { $unwind: { path: '$plan', preserveNullAndEmptyArrays: true } },
        { $group: { _id: '$plan.name', count: { $sum: 1 }, monthlyRevenue: { $sum: { $ifNull: ['$plan.price', 0] } } } },
        { $sort: { count: -1 } }
      ]),
      Company.find({ isSubscriptionActive: true })
        .populate('subscriptionPlan', 'name price')
        .select('companyName email usageStats subscriptionPlan')
        .sort({ 'usageStats.totalMessagesAllTime': -1 })
        .limit(10)
    ]);

    // Fill missing months
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push({ year: d.getFullYear(), month: d.getMonth() + 1, label: d.toLocaleString('default', { month: 'short' }) + ' ' + d.getFullYear().toString().slice(2) });
    }

    const revenueChart = months.map(m => {
      const found = revenueByMonth.find(r => r._id.year === m.year && r._id.month === m.month);
      return { label: m.label, revenue: found?.revenue || 0, count: found?.count || 0 };
    });
    const companiesChart = months.map(m => {
      const found = companiesGrowth.find(r => r._id.year === m.year && r._id.month === m.month);
      return { label: m.label, count: found?.count || 0 };
    });

    res.json({
      success: true,
      analytics: { revenueByMonth: revenueChart, messagesByDay, companiesGrowth: companiesChart, planDistribution, topCompanies }
    });
  } catch (error) {
    logger.error('Admin analytics error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// ─────────────────────────────────────────
//  COMPANIES
// ─────────────────────────────────────────
router.get('/companies', authenticate, isAdmin, async (req, res) => {
  try {
    const Company = require('../models/Company');
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const planId = req.query.planId || '';

    let query = {};
    if (search) query.$or = [{ companyName: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
    if (status === 'active') query.isSubscriptionActive = true;
    if (status === 'inactive') query.isSubscriptionActive = false;
    if (planId) query.subscriptionPlan = planId;

    const [companies, total] = await Promise.all([
      Company.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit)
        .populate('subscriptionPlan', 'name price maxDevices monthlyMessageLimit').select('-password'),
      Company.countDocuments(query)
    ]);

    res.json({ success: true, companies, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    logger.error('Admin get companies error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

router.get('/companies/:companyId', authenticate, isAdmin, async (req, res) => {
  try {
    const Company = require('../models/Company');
    const Device = require('../models/Device');
    const Message = require('../models/Message');
    const Invoice = require('../models/Invoice');

    const company = await Company.findById(req.params.companyId)
      .populate('subscriptionPlan').select('-password');
    if (!company) return res.status(404).json({ error: 'Company not found' });

    const [devices, totalMessages, invoices] = await Promise.all([
      Device.countDocuments({ companyId: company._id, isActive: true }),
      Message.countDocuments({ companyId: company._id }),
      Invoice.find({ companyId: company._id }).sort({ createdAt: -1 }).limit(5)
        .populate('subscriptionPlan', 'name price')
    ]);

    res.json({ success: true, company, stats: { devices, totalMessages }, recentInvoices: invoices });
  } catch (error) {
    logger.error('Admin get company detail error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch company' });
  }
});

router.put('/companies/:companyId', authenticate, isAdmin, async (req, res) => {
  try {
    const { isActive, isSubscriptionActive, planId, subscriptionEndDate, daysToAdd, role, name } = req.body;
    const Company = require('../models/Company');
    const company = await Company.findById(req.params.companyId);
    if (!company) return res.status(404).json({ error: 'Company not found' });

    if (name) company.companyName = name;
    if (isActive !== undefined) company.isActive = isActive;
    if (isSubscriptionActive !== undefined) company.isSubscriptionActive = isSubscriptionActive;
    if (planId) company.subscriptionPlan = planId;
    if (subscriptionEndDate) company.subscriptionEndDate = new Date(subscriptionEndDate);
    if (daysToAdd) {
      const base = company.subscriptionEndDate > new Date() ? company.subscriptionEndDate : new Date();
      const newEnd = new Date(base);
      newEnd.setDate(newEnd.getDate() + parseInt(daysToAdd));
      company.subscriptionEndDate = newEnd;
    }
    if (role) company.role = role;
    await company.save();

    const updated = await Company.findById(company._id).populate('subscriptionPlan').select('-password');
    logger.info('Admin updated company', { adminId: req.companyId, target: req.params.companyId });
    res.json({ success: true, company: updated });
  } catch (error) {
    logger.error('Admin update company error', { error: error.message });
    res.status(500).json({ error: 'Failed to update company' });
  }
});

// Legacy subscription update endpoint
router.put('/companies/:companyId/subscription', authenticate, isAdmin, async (req, res) => {
  try {
    const { planId, daysToAdd } = req.body;
    const Company = require('../models/Company');
    const company = await Company.findById(req.params.companyId);
    if (!company) return res.status(404).json({ error: 'Company not found' });
    if (planId) company.subscriptionPlan = planId;
    if (daysToAdd) {
      const newEnd = new Date(company.subscriptionEndDate);
      newEnd.setDate(newEnd.getDate() + parseInt(daysToAdd));
      company.subscriptionEndDate = newEnd;
    }
    company.isSubscriptionActive = true;
    await company.save();
    res.json({ success: true, message: 'Subscription updated' });
  } catch (error) {
    logger.error('Admin update subscription error', { error: error.message });
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

router.delete('/companies/:companyId', authenticate, isAdmin, async (req, res) => {
  try {
    const Company = require('../models/Company');
    const company = await Company.findByIdAndDelete(req.params.companyId);
    if (!company) return res.status(404).json({ error: 'Company not found' });
    res.json({ success: true, message: 'Company deleted' });
  } catch (error) {
    logger.error('Admin delete company error', { error: error.message });
    res.status(500).json({ error: 'Failed to delete company' });
  }
});

router.post('/companies/:companyId/api-key', authenticate, isAdmin, async (req, res) => {
  try {
    const Company = require('../models/Company');
    const company = await Company.findById(req.params.companyId);
    if (!company) return res.status(404).json({ error: 'Company not found' });
    const apiKey = company.generateApiKey();
    await company.save();
    res.json({ success: true, apiKey });
  } catch (error) {
    logger.error('Admin generate API key error', { error: error.message });
    res.status(500).json({ error: 'Failed to generate API key' });
  }
});

// ─────────────────────────────────────────
//  INVOICES
// ─────────────────────────────────────────
router.get('/invoices', authenticate, isAdmin, async (req, res) => {
  try {
    const Invoice = require('../models/Invoice');
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status || '';
    const companyId = req.query.companyId || '';

    let query = {};
    if (status) query.status = status;
    if (companyId) query.companyId = companyId;

    const [invoices, total, revAgg] = await Promise.all([
      Invoice.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit)
        .populate('companyId', 'companyName email')
        .populate('subscriptionPlan', 'name price'),
      Invoice.countDocuments(query),
      Invoice.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, total: { $sum: '$amount.totalAmount' }, count: { $sum: 1 } } }])
    ]);

    res.json({
      success: true, invoices,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      totals: { totalRevenue: revAgg[0]?.total || 0, paidCount: revAgg[0]?.count || 0 }
    });
  } catch (error) {
    logger.error('Admin get invoices error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

router.put('/invoices/:invoiceId/status', authenticate, isAdmin, async (req, res) => {
  try {
    const { status, paymentMethod } = req.body;
    const Invoice = require('../models/Invoice');
    const invoice = await Invoice.findById(req.params.invoiceId);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    invoice.status = status;
    if (status === 'paid') invoice.paymentDate = new Date();
    if (paymentMethod) invoice.paymentMethod = paymentMethod;
    await invoice.save();
    res.json({ success: true, invoice });
  } catch (error) {
    logger.error('Admin update invoice error', { error: error.message });
    res.status(500).json({ error: 'Failed to update invoice' });
  }
});

router.post('/invoices', authenticate, isAdmin, async (req, res) => {
  try {
    const { companyId, planId, durationDays, notes } = req.body;
    if (!companyId || !planId) return res.status(400).json({ error: 'companyId and planId are required' });

    const SubscriptionPlan = require('../models/SubscriptionPlan');
    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + (durationDays || 30));

    const basePrice = plan.price;
    const taxRate = 0.18;
    const taxAmount = +(basePrice * taxRate).toFixed(2);
    const totalAmount = +(basePrice + taxAmount).toFixed(2);

    const Invoice = require('../models/Invoice');
    const invoice = await Invoice.create({
      companyId, subscriptionPlan: planId,
      billingPeriodStart: now, billingPeriodEnd: endDate,
      dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      amount: { basePrice, taxRate, taxAmount, totalAmount },
      status: 'issued', notes, issuedAt: now
    });
    res.status(201).json({ success: true, invoice });
  } catch (error) {
    logger.error('Admin create invoice error', { error: error.message });
    res.status(500).json({ error: error.message || 'Failed to create invoice' });
  }
});

// ─────────────────────────────────────────
//  SUBSCRIPTION PLANS
// ─────────────────────────────────────────
router.get('/plans', authenticate, isAdmin, async (req, res) => {
  try {
    const SubscriptionPlan = require('../models/SubscriptionPlan');
    const Company = require('../models/Company');
    const [plans, countsAgg] = await Promise.all([
      SubscriptionPlan.find().sort({ price: 1 }),
      Company.aggregate([{ $group: { _id: '$subscriptionPlan', count: { $sum: 1 } } }])
    ]);
    const countMap = countsAgg.reduce((m, c) => { m[c._id?.toString()] = c.count; return m; }, {});
    const plansWithCounts = plans.map(p => ({
      ...p.toObject(),
      subscriberCount: countMap[p._id.toString()] || 0,
      monthlyRevenue: (countMap[p._id.toString()] || 0) * p.price
    }));
    res.json({ success: true, plans: plansWithCounts });
  } catch (error) {
    logger.error('Admin get plans error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

router.post('/plans', authenticate, isAdmin, async (req, res) => {
  try {
    const SubscriptionPlan = require('../models/SubscriptionPlan');
    const { name, price, maxDevices, monthlyMessageLimit, features, description, messagesPerMinute } = req.body;
    if (!name || price === undefined || !maxDevices || !monthlyMessageLimit) {
      return res.status(400).json({ error: 'name, price, maxDevices, and monthlyMessageLimit are required' });
    }
    const plan = await SubscriptionPlan.create({ name, price, maxDevices, monthlyMessageLimit, features: features || [], description, messagesPerMinute });
    res.status(201).json({ success: true, plan });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to create plan' });
  }
});

router.put('/plans/:planId', authenticate, isAdmin, async (req, res) => {
  try {
    const SubscriptionPlan = require('../models/SubscriptionPlan');
    const plan = await SubscriptionPlan.findByIdAndUpdate(req.params.planId, req.body, { new: true, runValidators: true });
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    res.json({ success: true, plan });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to update plan' });
  }
});

router.delete('/plans/:planId', authenticate, isAdmin, async (req, res) => {
  try {
    const SubscriptionPlan = require('../models/SubscriptionPlan');
    const plan = await SubscriptionPlan.findByIdAndDelete(req.params.planId);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    res.json({ success: true, message: 'Plan deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete plan' });
  }
});

// ─────────────────────────────────────────
//  PLATFORM SETTINGS
// ─────────────────────────────────────────

// Build { category: { key: value } } from DB documents
const buildGrouped = (docs) => {
  const grouped = {};
  docs.forEach(s => {
    if (!grouped[s.category]) grouped[s.category] = {};
    grouped[s.category][s.key] = s.value;
  });
  return grouped;
};

// GET /admin/settings — returns settings grouped by category
router.get('/settings', authenticate, isAdmin, async (req, res) => {
  try {
    const PlatformSettings = require('../models/PlatformSettings');
    const query = req.query.category ? { category: req.query.category } : {};
    const docs = await PlatformSettings.find(query);
    res.json({ success: true, settings: buildGrouped(docs) });
  } catch (error) {
    logger.error('Admin get settings error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PUT /admin/settings — accepts { settings: { general: { key: val }, payment: { key: val }, ... } }
router.put('/settings', authenticate, isAdmin, async (req, res) => {
  try {
    const PlatformSettings = require('../models/PlatformSettings');
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'settings object required' });
    }

    const validCategories = ['general', 'payment', 'smtp', 'limits', 'api'];
    const ops = [];

    // Frontend sends nested: { general: { key: val }, payment: { key: val }, ... }
    Object.entries(settings).forEach(([cat, catSettings]) => {
      if (!validCategories.includes(cat) || !catSettings || typeof catSettings !== 'object') return;
      Object.entries(catSettings).forEach(([key, value]) => {
        ops.push(PlatformSettings.set(key, value, cat));
      });
    });

    if (ops.length === 0) return res.status(400).json({ error: 'No valid settings to save' });

    await Promise.all(ops);
    const docs = await PlatformSettings.find({});
    res.json({ success: true, settings: buildGrouped(docs) });
  } catch (error) {
    logger.error('Admin update settings error', { error: error.message });
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ─────────────────────────────────────────
//  API KEYS
// ─────────────────────────────────────────
router.get('/api-keys', authenticate, isAdmin, async (req, res) => {
  try {
    const Company = require('../models/Company');
    const companies = await Company.find({ apiKey: { $exists: true, $ne: null } })
      .select('companyName email apiKey isActive subscriptionPlan createdAt')
      .populate('subscriptionPlan', 'name');
    res.json({ success: true, apiKeys: companies });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
});

router.delete('/api-keys/:companyId', authenticate, isAdmin, async (req, res) => {
  try {
    const Company = require('../models/Company');
    await Company.findByIdAndUpdate(req.params.companyId, { $unset: { apiKey: 1 } });
    res.json({ success: true, message: 'API key revoked' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
});

module.exports = router;
