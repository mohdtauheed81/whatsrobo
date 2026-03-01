const mongoose = require('mongoose');
const cron = require('node-cron');
const dotenv = require('dotenv');
const logger = require('../config/logger');
const { connectMongoDB } = require('../config/database');
const UsageTracker = require('../services/subscription/UsageTracker');

dotenv.config();

class UsageResetJob {
  /**
   * Start the usage reset job
   * Runs on the 1st of every month at 00:00 UTC
   */
  static async start() {
    try {
      logger.info('Starting UsageResetJob...');

      // Connect to MongoDB
      await connectMongoDB();
      logger.info('Connected to MongoDB');

      // Schedule cron job (0 0 1 * * = 1st day of month at midnight UTC)
      const job = cron.schedule('0 0 1 * *', async () => {
        logger.info('Running monthly usage reset job...');
        try {
          const result = await UsageTracker.resetMonthlyUsage();
          logger.info('Monthly usage reset completed', result);
        } catch (error) {
          logger.error('Error during usage reset', { error: error.message });
        }
      });

      logger.info('UsageResetJob scheduled successfully');

      // Handle signals
      process.on('SIGTERM', () => {
        logger.info('Stopping UsageResetJob...');
        job.stop();
        mongoose.connection.close();
        process.exit(0);
      });

      process.on('SIGINT', () => {
        logger.info('Stopping UsageResetJob...');
        job.stop();
        mongoose.connection.close();
        process.exit(0);
      });
    } catch (error) {
      logger.error('Failed to start UsageResetJob', { error: error.message });
      process.exit(1);
    }
  }
}

// Start the job
UsageResetJob.start();

module.exports = UsageResetJob;
