const logger = require('../../config/logger');

let stripeInstance = null;

const getStripe = () => {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    stripeInstance = require('stripe')(process.env.STRIPE_SECRET_KEY);
  }
  return stripeInstance;
};

class PaymentService {
  /**
   * Create a Stripe customer for a company
   */
  async createCustomer(company) {
    const stripe = getStripe();
    const customer = await stripe.customers.create({
      email: company.email,
      name: company.companyName,
      metadata: { companyId: company._id.toString() }
    });
    logger.info('Stripe customer created', { customerId: customer.id, companyId: company._id });
    return customer;

  }

  /**
   * Create a payment intent for a subscription plan
   */
  async createPaymentIntent(amount, currency, customerId, metadata = {}) {
    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      customer: customerId,
      metadata,
      automatic_payment_methods: { enabled: true }
    });
    logger.info('Payment intent created', { intentId: paymentIntent.id, amount });
    return paymentIntent;
  }

  /**
   * Confirm a payment using a payment method ID
   */
  async confirmPayment(paymentIntentId, paymentMethodId) {
    const stripe = getStripe();
    const intent = await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: paymentMethodId
    });
    logger.info('Payment confirmed', { intentId: paymentIntentId, status: intent.status });
    return intent;
  }

  /**
   * Create a full charge in one step (for simple direct payment)
   */
  async chargeCustomer({ amount, currency, customerId, paymentMethodId, description, metadata = {} }) {
    const stripe = getStripe();

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      customer: customerId,
      payment_method: paymentMethodId,
      description,
      metadata,
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never'
      }
    });

    if (paymentIntent.status !== 'succeeded') {
      throw new Error(`Payment failed with status: ${paymentIntent.status}`);
    }

    logger.info('Charge succeeded', { intentId: paymentIntent.id, amount, customerId });
    return paymentIntent;
  }

  /**
   * Issue a refund for a payment intent
   */
  async refundPayment(paymentIntentId, amount = null) {
    const stripe = getStripe();
    const refundData = { payment_intent: paymentIntentId };
    if (amount) refundData.amount = Math.round(amount * 100);

    const refund = await stripe.refunds.create(refundData);
    logger.info('Refund issued', { refundId: refund.id, paymentIntentId });
    return refund;
  }

  /**
   * Verify a Stripe webhook signature and return the event
   */
  verifyWebhook(rawBody, signature) {
    const stripe = getStripe();
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET not configured');
    return stripe.webhooks.constructEvent(rawBody, signature, secret);
  }

  /**
   * Get payment intent details
   */
  async getPaymentIntent(paymentIntentId) {
    const stripe = getStripe();
    return stripe.paymentIntents.retrieve(paymentIntentId);
  }
}

module.exports = new PaymentService();
