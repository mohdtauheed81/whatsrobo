const Queue = require('bull');
const { getRedisClient, isRedisConnected } = require('../../config/database');
const Message = require('../../models/Message');
const logger = require('../../config/logger');

class MessageQueueService {
  constructor() {
    this.queues = new Map(); // Map<companyId, Queue>
    this.inMemoryQueues = new Map(); // Fallback for when Redis is unavailable
    this.messagesPerMinute = parseInt(process.env.MESSAGES_PER_MINUTE || '20');
    this.globalMessageDelay = parseInt(process.env.GLOBAL_MESSAGE_DELAY || '1000');
    this.useRedis = false;
  }

  /**
   * Get or create queue for a company (with Redis if available, fallback to in-memory)
   */
  getOrCreateQueue(companyId) {
    const companyIdStr = companyId.toString();

    // Check if Redis is available
    if (isRedisConnected()) {
      this.useRedis = true;
      if (!this.queues.has(companyIdStr)) {
        try {
          const queue = new Queue(`messages:${companyIdStr}`, {
            redis: {
              host: process.env.REDIS_HOST || 'localhost',
              port: process.env.REDIS_PORT || 6379
            },
            defaultJobOptions: {
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 2000
              },
              removeOnComplete: true,
              removeOnFail: false
            },
            settings: {
              maxStalledCount: 2,
              stalledInterval: 5000,
              maxWaitingChildren: 10
            }
          });

          // Set up rate limiter for this queue
          queue.setDefaultRateLimitOptions({
            max: this.messagesPerMinute,
            duration: 60000
          });

          this.queues.set(companyIdStr, queue);
          logger.info('Queue created (Redis)', { companyId: companyIdStr });
        } catch (error) {
          logger.warn('Failed to create Redis queue, using in-memory fallback', { error: error.message });
          this.useRedis = false;
        }
      }
      if (this.queues.has(companyIdStr)) {
        return this.queues.get(companyIdStr);
      }
    }

    // Fallback: use in-memory queue when Redis is unavailable
    if (!this.inMemoryQueues.has(companyIdStr)) {
      this.inMemoryQueues.set(companyIdStr, {
        jobs: [],
        processing: false
      });
      logger.info('In-memory queue created (Redis unavailable)', { companyId: companyIdStr });
    }

    return this.inMemoryQueues.get(companyIdStr);
  }

  /**
   * Add a single message to queue (supports Redis or in-memory fallback)
   */
  async addMessage(companyId, messageData) {
    try {
      const companyIdStr = companyId.toString();
      const queue = this.getOrCreateQueue(companyId);

      // Create message record
      const message = new Message({
        companyId,
        deviceId: messageData.deviceId,
        recipient: messageData.phoneNumber,
        messageText: messageData.message,
        messageType: messageData.type || 'text',
        metadata: {
          source: messageData.source || 'manual',
          campaignId: messageData.campaignId
        }
      });

      await message.save();

      const jobData = {
        messageId: message._id,
        companyId,
        deviceId: messageData.deviceId,
        phoneNumber: messageData.phoneNumber,
        message: messageData.message,
        messageType: messageData.type || 'text'
      };

      let jobId = message._id.toString();
      let queueCount = 0;

      // Check if this is a Redis queue or in-memory queue
      if (queue.add && typeof queue.add === 'function') {
        // Redis Bull queue
        const job = await queue.add(jobData, {
          priority: messageData.priority || 0,
          delay: messageData.delay || 0,
          jobId
        });
        jobId = job.id;
        queueCount = await queue.count();
      } else {
        // In-memory queue fallback
        queue.jobs.push({
          id: jobId,
          data: jobData,
          createdAt: new Date(),
          priority: messageData.priority || 0,
          delay: messageData.delay || 0,
          status: 'waiting'
        });
        queueCount = queue.jobs.length;
        logger.info('Message added to in-memory queue', { companyId: companyIdStr });
      }

      logger.info('Message queued', {
        companyId: companyIdStr,
        messageId: message._id.toString(),
        jobId,
        queueType: queue.add ? 'redis' : 'memory'
      });

      return {
        success: true,
        messageId: message._id,
        jobId,
        queuePosition: queueCount
      };
    } catch (error) {
      logger.error('Failed to add message to queue', {
        companyId: companyId.toString(),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Add multiple messages in bulk (supports Redis or in-memory fallback)
   */
  async addBulkMessages(companyId, messages) {
    try {
      const companyIdStr = companyId.toString();
      const queue = this.getOrCreateQueue(companyId);

      // Create message records
      const messageRecords = await Promise.all(
        messages.map(msg => {
          const message = new Message({
            companyId,
            deviceId: msg.deviceId,
            recipient: msg.phoneNumber,
            messageText: msg.message,
            messageType: msg.type || 'text',
            bulkBatchId: msg.bulkBatchId,
            metadata: {
              source: 'bulk',
              campaignId: msg.campaignId
            }
          });
          return message.save();
        })
      );

      let jobsCount = 0;

      // Check if this is a Redis queue or in-memory queue
      if (queue.addBulk && typeof queue.addBulk === 'function') {
        // Redis Bull queue
        const jobs = await queue.addBulk(
          messageRecords.map((message, index) => ({
            name: 'send-message',
            data: {
              messageId: message._id,
              companyId,
              deviceId: messages[index].deviceId,
              phoneNumber: messages[index].phoneNumber,
              message: messages[index].message,
              messageType: messages[index].type || 'text'
            },
            opts: {
              priority: messages[index].priority || 0,
              delay: messages[index].delay || 0,
              jobId: message._id.toString()
            }
          }))
        );
        jobsCount = jobs.length;
      } else {
        // In-memory queue fallback
        messageRecords.forEach((message, index) => {
          queue.jobs.push({
            id: message._id.toString(),
            data: {
              messageId: message._id,
              companyId,
              deviceId: messages[index].deviceId,
              phoneNumber: messages[index].phoneNumber,
              message: messages[index].message,
              messageType: messages[index].type || 'text'
            },
            createdAt: new Date(),
            priority: messages[index].priority || 0,
            delay: messages[index].delay || 0,
            status: 'waiting'
          });
        });
        jobsCount = messageRecords.length;
        logger.info('Bulk messages added to in-memory queue', { companyId: companyIdStr, count: jobsCount });
      }

      const totalInQueue = queue.add ? await queue.count() : queue.jobs.length;

      logger.info('Bulk messages queued', {
        companyId: companyIdStr,
        count: jobsCount,
        queueType: queue.add ? 'redis' : 'memory'
      });

      return {
        success: true,
        queuedCount: jobsCount,
        messageIds: messageRecords.map(m => m._id),
        totalInQueue
      };
    } catch (error) {
      logger.error('Failed to add bulk messages', {
        companyId: companyId.toString(),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get queue status (supports Redis or in-memory fallback)
   */
  async getQueueStatus(companyId) {
    try {
      const companyIdStr = companyId.toString();
      const queue = this.getOrCreateQueue(companyId);

      if (queue.getJobCounts && typeof queue.getJobCounts === 'function') {
        // Redis Bull queue
        const counts = await queue.getJobCounts();
        const stats = await queue.getMetrics('completed');

        return {
          companyId: companyIdStr,
          waiting: counts.waiting,
          active: counts.active,
          completed: counts.completed,
          failed: counts.failed,
          delayed: counts.delayed,
          paused: counts.paused,
          totalJobs: Object.values(counts).reduce((a, b) => a + b, 0),
          completedToday: stats.count || 0,
          rateLimitPerMinute: this.messagesPerMinute,
          backend: 'redis'
        };
      } else {
        // In-memory queue fallback
        return {
          companyId: companyIdStr,
          waiting: queue.jobs.length,
          active: 0,
          completed: 0,
          failed: 0,
          delayed: 0,
          paused: 0,
          totalJobs: queue.jobs.length,
          completedToday: 0,
          rateLimitPerMinute: this.messagesPerMinute,
          backend: 'memory'
        };
      }
    } catch (error) {
      logger.error('Failed to get queue status', {
        companyId: companyId.toString(),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get queue for a company (for worker to process)
   */
  getQueue(companyId) {
    return this.getOrCreateQueue(companyId);
  }

  /**
   * Pause queue (supports Redis or in-memory fallback)
   */
  async pauseQueue(companyId) {
    try {
      const companyIdStr = companyId.toString();
      const queue = this.getOrCreateQueue(companyId);

      if (queue.pause && typeof queue.pause === 'function') {
        await queue.pause();
      } else {
        queue.processing = false;
        logger.info('In-memory queue paused', { companyId: companyIdStr });
      }
      logger.info('Queue paused', { companyId: companyIdStr });
    } catch (error) {
      logger.error('Failed to pause queue', {
        companyId: companyId.toString(),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Resume queue (supports Redis or in-memory fallback)
   */
  async resumeQueue(companyId) {
    try {
      const companyIdStr = companyId.toString();
      const queue = this.getOrCreateQueue(companyId);

      if (queue.resume && typeof queue.resume === 'function') {
        await queue.resume();
      } else {
        queue.processing = true;
        logger.info('In-memory queue resumed', { companyId: companyIdStr });
      }
      logger.info('Queue resumed', { companyId: companyIdStr });
    } catch (error) {
      logger.error('Failed to resume queue', {
        companyId: companyId.toString(),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Clean up old jobs (supports Redis or in-memory fallback)
   */
  async cleanQueue(companyId, grace = 3600000) {
    try {
      const companyIdStr = companyId.toString();
      const queue = this.getOrCreateQueue(companyId);

      if (queue.clean && typeof queue.clean === 'function') {
        const cleaned = await queue.clean(grace, 10000);
        logger.info('Queue cleaned', {
          companyId: companyIdStr,
          jobsRemoved: cleaned.length
        });
        return cleaned;
      } else {
        // In-memory queue: remove jobs older than grace period
        const cutoffTime = new Date(Date.now() - grace);
        const initialLength = queue.jobs.length;
        queue.jobs = queue.jobs.filter(job => job.createdAt > cutoffTime);
        const removed = initialLength - queue.jobs.length;
        logger.info('In-memory queue cleaned', {
          companyId: companyIdStr,
          jobsRemoved: removed
        });
        return Array(removed).fill(null);
      }
    } catch (error) {
      logger.error('Failed to clean queue', {
        companyId: companyId.toString(),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Remove a specific job (supports Redis or in-memory fallback)
   */
  async removeJob(companyId, jobId) {
    try {
      const companyIdStr = companyId.toString();
      const queue = this.getOrCreateQueue(companyId);

      if (queue.getJob && typeof queue.getJob === 'function') {
        const job = await queue.getJob(jobId);
        if (job) {
          await job.remove();
          logger.info('Job removed', { companyId: companyIdStr, jobId });
        }
      } else {
        // In-memory queue
        const initialLength = queue.jobs.length;
        queue.jobs = queue.jobs.filter(job => job.id !== jobId);
        if (queue.jobs.length < initialLength) {
          logger.info('In-memory job removed', { companyId: companyIdStr, jobId });
        }
      }
    } catch (error) {
      logger.error('Failed to remove job', {
        companyId: companyId.toString(),
        jobId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get all queues (for monitoring)
   */
  getAllQueues() {
    return Array.from(this.queues.entries()).map(([companyId, queue]) => ({
      companyId,
      queue
    }));
  }

  /**
   * Close all queues gracefully (Redis or in-memory)
   */
  async closeAll() {
    try {
      logger.info('Closing all message queues...');

      // Close Redis queues
      for (const [companyId, queue] of this.queues) {
        if (queue.close && typeof queue.close === 'function') {
          await queue.close();
        }
      }
      this.queues.clear();

      // Clear in-memory queues
      this.inMemoryQueues.clear();

      logger.info('All queues closed');
    } catch (error) {
      logger.error('Error closing queues', { error: error.message });
    }
  }
}

// Singleton instance
let instance = null;

const getMessageQueueService = () => {
  if (!instance) {
    instance = new MessageQueueService();
  }
  return instance;
};

module.exports = {
  MessageQueueService,
  getMessageQueueService
};
