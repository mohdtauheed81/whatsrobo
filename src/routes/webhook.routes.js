const express = require('express');
const router = express.Router();
const logger = require('../config/logger');

// Stripe webhook - must use raw body (configured in server.js)
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['stripe-signature'];
  if (!signature) return res.status(400).json({ error: 'Missing stripe-signature header' });

  let event;
  try {
    const PaymentService = require('../services/subscription/PaymentService');
    event = PaymentService.verifyWebhook(req.body, signature);
  } catch (err) {
    logger.error('Webhook signature verification failed', { error: err.message });
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object;
        const { companyId, planId } = intent.metadata;
        logger.info('Webhook: payment_intent.succeeded', { intentId: intent.id, companyId, planId });

        // Record payment in Invoice if not already done (idempotent)
        if (companyId && planId) {
          const Invoice = require('../models/Invoice');
          await Invoice.findOneAndUpdate(
            { stripePaymentIntentId: intent.id },
            { status: 'paid', paidAt: new Date(), paidAmount: intent.amount / 100 },
            { new: true }
          );
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const intent = event.data.object;
        const { companyId } = intent.metadata;
        const errorMsg = intent.last_payment_error?.message || 'Unknown error';
        logger.warn('Webhook: payment failed', { intentId: intent.id, companyId, error: errorMsg });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const Company = require('../models/Company');
        const company = await Company.findOne({ stripeCustomerId: subscription.customer });
        if (company) {
          company.isSubscriptionActive = false;
          await company.save();
          logger.info('Webhook: subscription cancelled', { companyId: company._id });
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        logger.info('Webhook: invoice paid', { invoiceId: invoice.id, customerId: invoice.customer });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        logger.warn('Webhook: invoice payment failed', { invoiceId: invoice.id, customerId: invoice.customer });
        break;
      }

      default:
        logger.debug('Unhandled Stripe webhook event', { type: event.type });
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Webhook handler error', { type: event?.type, error: error.message });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;
