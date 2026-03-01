const Company = require('../../models/Company');
const logger = require('../../config/logger');

class UsageTracker {
  /**
   * Atomically increment message count for a company
   * @param {ObjectId} companyId - Company ID
   * @returns {Promise<Object>} - Updated usage stats
   */
  static async incrementMessageCount(companyId) {
    try {
      const company = await Company.findByIdAndUpdate(
        companyId,
        {
          $inc: { 'usageStats.messagesThisMonth': 1, 'usageStats.totalMessagesAllTime': 1 }
        },
        { new: true }
      );

      if (!company) {
        throw new Error('Company not found');
      }

      return {
        messagesThisMonth: company.usageStats.messagesThisMonth,
        totalMessagesAllTime: company.usageStats.totalMessagesAllTime
      };
    } catch (error) {
      logger.error('Failed to increment message count', { companyId, error: error.message });
      throw error;
    }
  }

  /**
   * Check if company can send a message
   * @param {ObjectId} companyId - Company ID
   * @returns {Promise<Object>} - { canSend: boolean, remaining: number, message: string }
   */
  static async canSendMessage(companyId) {
    try {
      const company = await Company.findById(companyId).populate('subscriptionPlan');

      if (!company) {
        return { canSend: false, message: 'Company not found' };
      }

      // Check if subscription is active
      const now = new Date();
      if (company.subscriptionEndDate < now) {
        return { canSend: false, message: 'Subscription expired' };
      }

      const remaining = company.subscriptionPlan.monthlyMessageLimit - company.usageStats.messagesThisMonth;

      if (remaining <= 0) {
        return {
          canSend: false,
          remaining: 0,
          message: `Monthly limit of ${company.subscriptionPlan.monthlyMessageLimit} reached`
        };
      }

      return {
        canSend: true,
        remaining,
        usage: company.usageStats.messagesThisMonth,
        limit: company.subscriptionPlan.monthlyMessageLimit
      };
    } catch (error) {
      logger.error('Failed to check message limit', { companyId, error: error.message });
      throw error;
    }
  }

  /**
   * Reset monthly usage for all companies
   * Usually called via a cron job on the 1st of each month
   * @returns {Promise<Object>} - { modifiedCount, message }
   */
  static async resetMonthlyUsage() {
    try {
      const result = await Company.updateMany(
        {},
        {
          $set: {
            'usageStats.messagesThisMonth': 0,
            'usageStats.lastResetDate': new Date()
          }
        }
      );

      logger.info('Monthly usage reset', { modifiedCount: result.modifiedCount });

      return {
        success: true,
        modifiedCount: result.modifiedCount,
        message: `Reset usage for ${result.modifiedCount} companies`
      };
    } catch (error) {
      logger.error('Failed to reset monthly usage', { error: error.message });
      throw error;
    }
  }

  /**
   * Get usage statistics for a company
   * @param {ObjectId} companyId - Company ID
   * @returns {Promise<Object>} - Usage statistics
   */
  static async getUsageStats(companyId) {
    try {
      const company = await Company.findById(companyId).populate('subscriptionPlan');

      if (!company) {
        throw new Error('Company not found');
      }

      const remaining = company.subscriptionPlan.monthlyMessageLimit - company.usageStats.messagesThisMonth;
      const percentageUsed = Math.round((company.usageStats.messagesThisMonth / company.subscriptionPlan.monthlyMessageLimit) * 100);

      return {
        messagesThisMonth: company.usageStats.messagesThisMonth,
        monthlyLimit: company.subscriptionPlan.monthlyMessageLimit,
        remaining,
        percentageUsed,
        totalMessagesAllTime: company.usageStats.totalMessagesAllTime,
        lastResetDate: company.usageStats.lastResetDate
      };
    } catch (error) {
      logger.error('Failed to get usage stats', { companyId, error: error.message });
      throw error;
    }
  }

  /**
   * Check if usage reset is needed (called monthly)
   * @param {ObjectId} companyId - Company ID
   * @returns {Promise<boolean>} - True if reset was performed
   */
  static async checkAndResetMonthlyUsage(companyId) {
    try {
      const company = await Company.findById(companyId);

      if (!company) {
        throw new Error('Company not found');
      }

      const now = new Date();
      const lastReset = new Date(company.usageStats.lastResetDate);

      // Check if we're in a different month
      if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
        await Company.findByIdAndUpdate(
          companyId,
          {
            $set: {
              'usageStats.messagesThisMonth': 0,
              'usageStats.lastResetDate': now
            }
          }
        );
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Failed to check and reset usage', { companyId, error: error.message });
      throw error;
    }
  }
}

module.exports = UsageTracker;
