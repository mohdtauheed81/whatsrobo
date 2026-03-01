const mongoose = require('mongoose');
const dotenv = require('dotenv');
const logger = require('../../config/logger');
const { connectMongoDB, connectRedis } = require('../../config/database');
const { getWhatsAppManager } = require('../whatsapp/WhatsAppManager');
const { getMessageQueueService } = require('../messaging/MessageQueue');
const Message = require('../../models/Message');
const Device = require('../../models/Device');

dotenv.config();

const GLOBAL_MESSAGE_DELAY = parseInt(process.env.GLOBAL_MESSAGE_DELAY || '1000');

class MessageWorker {
  constructor() {
    this.whatsAppManager = getWhatsAppManager();
    this.messageQueue = getMessageQueueService();
    this.isRunning = false;
  }

  /**
   * Start the worker
   */
  async start() {
    try {
      logger.info('Starting MessageWorker...');

      // Connect to MongoDB
      await connectMongoDB();
      logger.info('Connected to MongoDB');

      // Connect to Redis
      await connectRedis();
      logger.info('Connected to Redis');

      this.isRunning = true;

      // Get all company IDs with active messages
      const companies = await Message.distinct('companyId');

      logger.info(`Processing queues for ${companies.length} companies`);

      // Set up processors for all companies
      for (const companyId of companies) {
        this.setupQueueProcessor(companyId);
      }

      logger.info('MessageWorker started successfully');
    } catch (error) {
      logger.error('Failed to start MessageWorker', { error: error.message });
      process.exit(1);
    }
  }

  /**
   * Set up queue processor for a company
   */
  setupQueueProcessor(companyId) {
    const queue = this.messageQueue.getQueue(companyId);

    // Process messages
    queue.process(async (job) => {
      return this.processMessage(job);
    });

    // Job completed event
    queue.on('completed', (job) => {
      logger.info('Job completed', {
        companyId: companyId.toString(),
        jobId: job.id
      });
    });

    // Job failed event
    queue.on('failed', (job, error) => {
      logger.error('Job failed', {
        companyId: companyId.toString(),
        jobId: job.id,
        attempt: job.attemptsMade,
        error: error.message
      });
    });

    // Job error event
    queue.on('error', (error) => {
      logger.error('Queue error', {
        companyId: companyId.toString(),
        error: error.message
      });
    });

    logger.info('Queue processor setup', { companyId: companyId.toString() });
  }

  /**
   * Process a single message job
   */
  async processMessage(job) {
    const { messageId, companyId, deviceId, phoneNumber, message, messageType } = job.data;

    try {
      logger.info('Processing message', {
        jobId: job.id,
        messageId,
        companyId: companyId.toString(),
        deviceId: deviceId.toString()
      });

      // Update message status
      await Message.findByIdAndUpdate(messageId, { status: 'processing' });

      // Get device
      const device = await Device.findById(deviceId);
      if (!device) {
        throw new Error('Device not found');
      }

      // Check if device is connected
      if (!this.whatsAppManager.isClientConnected(deviceId)) {
        throw new Error('Device is not connected');
      }

      // Send message
      const result = await this.whatsAppManager.sendMessage(deviceId, phoneNumber, message);

      // Update message with WhatsApp message ID and sent status
      await Message.findByIdAndUpdate(messageId, {
        status: 'sent',
        whatsappMessageId: result.whatsappMessageId,
        sentAt: new Date()
      });

      // Increment usage counter
      const UsageTracker = require('../subscription/UsageTracker');
      await UsageTracker.incrementMessageCount(companyId);

      logger.info('Message sent successfully', {
        jobId: job.id,
        messageId,
        whatsappMessageId: result.whatsappMessageId
      });

      // Global delay to prevent WhatsApp rate limiting
      await new Promise(resolve => setTimeout(resolve, GLOBAL_MESSAGE_DELAY));

      return {
        success: true,
        whatsappMessageId: result.whatsappMessageId,
        sentAt: new Date()
      };
    } catch (error) {
      logger.error('Failed to process message', {
        jobId: job.id,
        messageId,
        error: error.message,
        attempt: job.attemptsMade
      });

      // Update message status
      await Message.findByIdAndUpdate(messageId, {
        status: job.attemptsMade >= 3 ? 'failed' : 'queued',
        errorMessage: error.message,
        retryCount: job.attemptsMade
      });

      throw error;
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    try {
      logger.info('Shutting down MessageWorker...');

      this.isRunning = false;

      // Close all queues
      await this.messageQueue.closeAll();

      // Close MongoDB
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
      }

      logger.info('MessageWorker shut down successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', { error: error.message });
      process.exit(1);
    }
  }
}

// Create and start worker
const worker = new MessageWorker();

// Handle signals
process.on('SIGTERM', () => worker.shutdown());
process.on('SIGINT', () => worker.shutdown());

// Start the worker
worker.start();

module.exports = MessageWorker;
