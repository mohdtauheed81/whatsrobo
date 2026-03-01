const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Company = require('../src/models/Company');
const SubscriptionPlan = require('../src/models/SubscriptionPlan');
const logger = require('../src/config/logger');

dotenv.config();

const seedDemoAccounts = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp_saas');
        logger.info('Connected to MongoDB');

        const enterprisePlan = await SubscriptionPlan.findOne({ name: 'Enterprise' });
        if (!enterprisePlan) {
            logger.error('No Enterprise plan found. Please run seedSubscriptionPlans.js first.');
            process.exit(1);
        }

        // Clear existing demo accounts to avoid duplication
        await Company.deleteMany({ email: { $in: ['admin@saaswhatsapp.com', 'user@demo.com'] } });

        // Create Admin
        const adminUser = new Company({
            companyName: 'SaaS Super Admin',
            email: 'admin@saaswhatsapp.com',
            password: 'AdminPassword123!',
            role: 'admin', // This grants Super Admin access
            subscriptionPlan: enterprisePlan._id,
            subscriptionEndDate: new Date(new Date().setFullYear(new Date().getFullYear() + 10)),
            isVerified: true
        });

        // Create Normal User
        const normalUser = new Company({
            companyName: 'Demo Client Corp',
            email: 'user@demo.com',
            password: 'UserPassword123!',
            role: 'user',
            subscriptionPlan: enterprisePlan._id,
            subscriptionEndDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
            isVerified: true
        });

        await adminUser.save();
        await normalUser.save();

        logger.info('Successfully created demo accounts');
        logger.info('Admin: admin@saaswhatsapp.com / AdminPassword123!');
        logger.info('User: user@demo.com / UserPassword123!');

        await mongoose.connection.close();
    } catch (error) {
        logger.error('Seeding failed', { error: error.message });
        process.exit(1);
    }
};

seedDemoAccounts();
