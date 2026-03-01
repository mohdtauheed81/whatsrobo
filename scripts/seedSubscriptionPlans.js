const mongoose = require('mongoose');
const dotenv = require('dotenv');
const SubscriptionPlan = require('../src/models/SubscriptionPlan');
const logger = require('../src/config/logger');

dotenv.config();

const seedPlans = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp_saas');
    logger.info('Connected to MongoDB');

    // Clear existing plans
    await SubscriptionPlan.deleteMany({});
    logger.info('Cleared existing subscription plans');

    // Define subscription plans
    const plans = [
      {
        name: 'Starter',
        description: 'Perfect for small businesses getting started with WhatsApp',
        price: 29,
        billingCycle: 'monthly',
        maxDevices: 1,
        monthlyMessageLimit: 5000,
        messagesPerMinute: 20,
        features: ['manual_messaging', 'auto_reply'],
        isActive: true
      },
      {
        name: 'Professional',
        description: 'Ideal for growing businesses with multiple teams',
        price: 99,
        billingCycle: 'monthly',
        maxDevices: 3,
        monthlyMessageLimit: 50000,
        messagesPerMinute: 20,
        features: ['manual_messaging', 'bulk_messaging', 'auto_reply', 'api_access'],
        isActive: true
      },
      {
        name: 'Enterprise',
        description: 'For large enterprises with unlimited growth',
        price: 299,
        billingCycle: 'monthly',
        maxDevices: 5,
        monthlyMessageLimit: 200000,
        messagesPerMinute: 30,
        features: ['manual_messaging', 'bulk_messaging', 'auto_reply', 'api_access', 'advanced_analytics'],
        isActive: true
      }
    ];

    // Insert plans
    const createdPlans = await SubscriptionPlan.insertMany(plans);
    logger.info(`Successfully created ${createdPlans.length} subscription plans:`, {
      plans: createdPlans.map(p => ({ id: p._id, name: p.name, price: p.price }))
    });

    await mongoose.connection.close();
    logger.info('Seeding completed successfully');
  } catch (error) {
    logger.error('Seeding failed', { error: error.message });
    process.exit(1);
  }
};

seedPlans();
