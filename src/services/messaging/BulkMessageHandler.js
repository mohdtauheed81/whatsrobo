const BulkMessage = require('../../models/BulkMessage');
const Message = require('../../models/Message');
const logger = require('../../config/logger');

class BulkMessageHandler {
  /**
   * Create a new bulk message batch
   */
  static async createBulkBatch(companyId, deviceId, batchData, messageQueueService) {
    try {
      const { batchName, fileName, contacts, messageTemplate, settings } = batchData;

      // Create bulk batch record
      const bulkBatch = new BulkMessage({
        companyId,
        deviceId,
        batchName,
        fileName,
        totalContacts: contacts.length,
        messageTemplate,
        status: 'pending',
        settings: {
          includeTimestamp: settings?.includeTimestamp || false,
          delayBetweenMessages: settings?.delayBetweenMessages || 1000,
          retryFailed: settings?.retryFailed !== false
        },
        contacts: contacts.map(contact => ({
          phoneNumber: contact.phoneNumber,
          name: contact.name,
          status: 'pending'
        })),
        metadata: {
          uploadedAt: new Date(),
          source: 'excel'
        }
      });

      await bulkBatch.save();

      // Queue all messages
      const messagesToQueue = contacts.map((contact, index) => {
        // Personalize message with contact name if available
        let personalizedMessage = messageTemplate;
        if (contact.name) {
          personalizedMessage = personalizedMessage.replace(/\{\{name\}\}/g, contact.name);
        }

        // Add timestamp if configured
        if (settings?.includeTimestamp) {
          personalizedMessage += `\n${new Date().toLocaleString()}`;
        }

        return {
          phoneNumber: contact.phoneNumber,
          message: personalizedMessage,
          type: 'text',
          source: 'bulk',
          bulkBatchId: bulkBatch._id,
          priority: -(index) // Negative priority for queue ordering
        };
      });

      const queueResult = await messageQueueService.addBulkMessages(companyId, messagesToQueue);

      // Update batch with message IDs
      bulkBatch.contacts = bulkBatch.contacts.map((contact, index) => ({
        ...contact,
        messageId: queueResult.messageIds[index]
      }));

      bulkBatch.status = 'processing';
      bulkBatch.startedAt = new Date();
      await bulkBatch.save();

      logger.info('Bulk message batch created', {
        batchId: bulkBatch._id.toString(),
        totalContacts: contacts.length,
        queued: queueResult.queuedCount
      });

      return {
        success: true,
        batchId: bulkBatch._id,
        totalQueued: queueResult.queuedCount,
        totalFailed: contacts.length - queueResult.queuedCount
      };
    } catch (error) {
      logger.error('Failed to create bulk batch', {
        companyId: companyId.toString(),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get bulk batch status and progress
   */
  static async getBatchStatus(batchId, companyId) {
    try {
      const batch = await BulkMessage.findOne({
        _id: batchId,
        companyId
      });

      if (!batch) {
        throw new Error('Batch not found');
      }

      return {
        batchId: batch._id.toString(),
        batchName: batch.batchName,
        status: batch.status,
        totalContacts: batch.totalContacts,
        progress: {
          sent: batch.progress.sent,
          delivered: batch.progress.delivered,
          failed: batch.progress.failed,
          pending: batch.progress.pending,
          deliveryRate: Math.round((batch.progress.delivered / batch.totalContacts) * 100)
        },
        startedAt: batch.startedAt,
        completedAt: batch.completedAt,
        estimatedTimeRemaining: batch.estimatedTimeRemaining
      };
    } catch (error) {
      logger.error('Failed to get batch status', {
        batchId: batchId.toString(),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get batch report with details
   */
  static async getBatchReport(batchId, companyId, options = {}) {
    try {
      const { page = 1, limit = 50, status: filterStatus } = options;
      const skip = (page - 1) * limit;

      const batch = await BulkMessage.findOne({
        _id: batchId,
        companyId
      });

      if (!batch) {
        throw new Error('Batch not found');
      }

      // Filter contacts by status if provided
      let contacts = batch.contacts;
      if (filterStatus) {
        contacts = contacts.filter(c => c.status === filterStatus);
      }

      const paginatedContacts = contacts.slice(skip, skip + limit);

      return {
        batchId: batch._id.toString(),
        batchName: batch.batchName,
        totalContacts: batch.totalContacts,
        progress: batch.progress,
        contacts: paginatedContacts,
        pagination: {
          page,
          limit,
          total: contacts.length,
          pages: Math.ceil(contacts.length / limit)
        },
        summary: {
          sentPercentage: Math.round((batch.progress.sent / batch.totalContacts) * 100),
          deliveredPercentage: Math.round((batch.progress.delivered / batch.totalContacts) * 100),
          failedPercentage: Math.round((batch.progress.failed / batch.totalContacts) * 100),
          pendingPercentage: Math.round((batch.progress.pending / batch.totalContacts) * 100)
        }
      };
    } catch (error) {
      logger.error('Failed to get batch report', {
        batchId: batchId.toString(),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update contact status in batch
   */
  static async updateContactStatus(batchId, companyId, phoneNumber, newStatus) {
    try {
      // Update in BulkMessage
      const batch = await BulkMessage.findOneAndUpdate(
        { _id: batchId, companyId, 'contacts.phoneNumber': phoneNumber },
        {
          $set: { 'contacts.$.status': newStatus },
          $inc: {
            [`progress.${newStatus}`]: 1,
            'progress.pending': -1
          }
        },
        { new: true }
      );

      if (!batch) {
        throw new Error('Contact not found in batch');
      }

      // Check if all contacts are processed
      if (batch.progress.pending === 0) {
        batch.status = 'completed';
        batch.completedAt = new Date();
        await batch.save();

        logger.info('Bulk batch completed', { batchId: batchId.toString() });
      }

      return batch;
    } catch (error) {
      logger.error('Failed to update contact status', {
        batchId: batchId.toString(),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get all batches for a company
   */
  static async getCompanyBatches(companyId, options = {}) {
    try {
      const { page = 1, limit = 20, status: filterStatus } = options;
      const skip = (page - 1) * limit;

      const query = { companyId };
      if (filterStatus) {
        query.status = filterStatus;
      }

      const [batches, total] = await Promise.all([
        BulkMessage.find(query)
          .populate('deviceId', 'phoneNumber')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        BulkMessage.countDocuments(query)
      ]);

      return {
        batches: batches.map(batch => ({
          _id: batch._id,
          batchName: batch.batchName,
          status: batch.status,
          totalContacts: batch.totalContacts,
          progress: batch.progress,
          createdAt: batch.createdAt,
          completedAt: batch.completedAt,
          device: batch.deviceId
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Failed to get company batches', {
        companyId: companyId.toString(),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Cancel a bulk batch
   */
  static async cancelBatch(batchId, companyId) {
    try {
      const batch = await BulkMessage.findOneAndUpdate(
        { _id: batchId, companyId },
        { status: 'cancelled', completedAt: new Date() },
        { new: true }
      );

      if (!batch) {
        throw new Error('Batch not found');
      }

      logger.info('Bulk batch cancelled', { batchId: batchId.toString() });
      return batch;
    } catch (error) {
      logger.error('Failed to cancel batch', {
        batchId: batchId.toString(),
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = BulkMessageHandler;
