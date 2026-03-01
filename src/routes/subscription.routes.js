const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const logger = require('../config/logger');

// Get all available subscription plans
router.get('/plans', authenticate, async (req, res) => {
  try {
    const SubscriptionPlan = require('../models/SubscriptionPlan');
    const plans = await SubscriptionPlan.find({ isActive: true }).sort({ price: 1 });
    res.json({ success: true, plans });
  } catch (error) {
    logger.error('Get plans error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});
// Get current company subscription info
router.get('/current', authenticate, async (req, res) => {
  try {
    const Company = require('../models/Company');
    const company = await Company.findById(req.companyId)
      .populate('subscriptionPlan')
      .select('-password');

    if (!company) return res.status(404).json({ error: 'Company not found' });

    const now = new Date();
    const daysRemaining = Math.max(0, Math.ceil((company.subscriptionEndDate - now) / (1000 * 60 * 60 * 24)));

    res.json({
      success: true,
      subscription: {
        plan: company.subscriptionPlan,
        startDate: company.subscriptionStartDate,
        endDate: company.subscriptionEndDate,
        isActive: company.isSubscriptionActive && company.subscriptionEndDate > now,
        daysRemaining,
        usageStats: company.usageStats
      }
    });
  } catch (error) {
    logger.error('Get subscription error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// Create payment intent for plan upgrade (Step 1 of checkout)
router.post('/create-payment-intent', authenticate, async (req, res) => {
  try {
    const { planId } = req.body;
    if (!planId) return res.status(400).json({ error: 'planId is required' });

    const SubscriptionPlan = require('../models/SubscriptionPlan');
    const Company = require('../models/Company');
    const PaymentService = require('../services/subscription/PaymentService');

    const plan = await SubscriptionPlan.findById(planId);
    if (!plan || !plan.isActive) return res.status(404).json({ error: 'Plan not found' });

    const company = await Company.findById(req.companyId).select('-password');
    if (!company) return res.status(404).json({ error: 'Company not found' });

    // Create or reuse Stripe customer
    let stripeCustomerId = company.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await PaymentService.createCustomer(company);
      stripeCustomerId = customer.id;
      await Company.findByIdAndUpdate(req.companyId, { stripeCustomerId });
    }

    const currency = process.env.INVOICE_CURRENCY || 'USD';
    const paymentIntent = await PaymentService.createPaymentIntent(
      plan.price,
      currency,
      stripeCustomerId,
      { companyId: req.companyId.toString(), planId: plan._id.toString() }
    );

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: plan.price,
      currency,
      plan: { _id: plan._id, name: plan.name, price: plan.price }
    });
  } catch (error) {
    logger.error('Create payment intent error', { error: error.message });
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// Upgrade subscription plan (Step 2: confirm payment and activate plan)
router.post('/upgrade', authenticate, async (req, res) => {
  try {
    const { planId, paymentMethodId, paymentIntentId } = req.body;
    if (!planId) return res.status(400).json({ error: 'planId is required' });

    const SubscriptionPlan = require('../models/SubscriptionPlan');
    const Company = require('../models/Company');
    const InvoiceGenerator = require('../services/subscription/InvoiceGenerator');

    const plan = await SubscriptionPlan.findById(planId);
    if (!plan || !plan.isActive) return res.status(404).json({ error: 'Plan not found' });

    const company = await Company.findById(req.companyId).select('-password');
    if (!company) return res.status(404).json({ error: 'Company not found' });

    // Process payment if Stripe is configured and payment details provided
    let paymentResult = null;
    if (process.env.STRIPE_SECRET_KEY && (paymentMethodId || paymentIntentId)) {
      const PaymentService = require('../services/subscription/PaymentService');

      if (paymentIntentId) {
        // Confirm existing payment intent
        paymentResult = await PaymentService.confirmPayment(paymentIntentId, paymentMethodId);
        if (paymentResult.status !== 'succeeded') {
          return res.status(402).json({ error: 'Payment not completed', status: paymentResult.status });
        }
      } else if (paymentMethodId) {
        // Create and confirm charge directly
        let stripeCustomerId = company.stripeCustomerId;
        if (!stripeCustomerId) {
          const customer = await PaymentService.createCustomer(company);
          stripeCustomerId = customer.id;
          await Company.findByIdAndUpdate(req.companyId, { stripeCustomerId });
        }
        const currency = process.env.INVOICE_CURRENCY || 'USD';
        paymentResult = await PaymentService.chargeCustomer({
          amount: plan.price,
          currency,
          customerId: stripeCustomerId,
          paymentMethodId,
          description: `${plan.name} Subscription`,
          metadata: { companyId: req.companyId.toString(), planId: plan._id.toString() }
        });
      }

      logger.info('Payment processed', { companyId: req.companyId, planId: plan._id, amount: plan.price });
    } else if (process.env.STRIPE_SECRET_KEY && !paymentMethodId && !paymentIntentId) {
      // Stripe is configured but no payment provided
      return res.status(400).json({
        error: 'Payment details required. Provide paymentMethodId or complete a payment intent first.'
      });
    }
    // If STRIPE_SECRET_KEY not set, allow upgrade without payment (dev/test mode)

    const now = new Date();
    const newEndDate = new Date(now);
    newEndDate.setMonth(newEndDate.getMonth() + 1);

    company.subscriptionPlan = plan._id;
    company.subscriptionStartDate = now;
    company.subscriptionEndDate = newEndDate;
    company.isSubscriptionActive = true;
    await company.save();

    // Generate invoice
    try {
      await InvoiceGenerator.createForSubscription(company._id, plan._id, {
        billingPeriodStart: now,
        billingPeriodEnd: newEndDate,
        stripePaymentIntentId: paymentResult?.id || null
      });
    } catch (invoiceErr) {
      logger.warn('Invoice generation failed after upgrade', { error: invoiceErr.message });
    }

    logger.info('Subscription upgraded', { companyId: req.companyId, planId: plan._id, planName: plan.name });

    res.json({
      success: true,
      message: 'Subscription upgraded successfully',
      paymentStatus: paymentResult ? paymentResult.status : 'not_required',
      subscription: {
        plan,
        startDate: now,
        endDate: newEndDate,
        isActive: true
      }
    });
  } catch (error) {
    logger.error('Upgrade subscription error', { error: error.message });
    if (error.type === 'StripeCardError') {
      return res.status(402).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to upgrade subscription' });
  }
});

module.exports = router;
