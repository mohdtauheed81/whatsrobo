const AutoReplyRule = require('../../models/AutoReplyRule');
const logger = require('../../config/logger');

class AutoReplyEngine {
  /**
   * Check if any auto-reply rules match the incoming message
   */
  static async checkAndProcessAutoReply(messageData, device, companyId, messageQueueService) {
    try {
      const { body: messageText, from } = messageData;
      const phoneNumber = from.replace('@c.us', '');

      // Get all active auto-reply rules for this device
      const rules = await AutoReplyRule.find({
        deviceId: device._id,
        companyId,
        isActive: true
      }).sort({ priority: -1 });

      if (rules.length === 0) {
        return null;
      }

      // Check each rule in priority order
      for (const rule of rules) {
        if (this.matchRule(messageText, rule)) {
          return this.processRule(rule, phoneNumber, device, companyId, messageQueueService);
        }
      }

      return null;
    } catch (error) {
      logger.error('Failed to check auto-reply rules', {
        deviceId: device._id.toString(),
        error: error.message
      });
      return null;
    }
  }

  /**
   * Check if message matches a rule
   */
  static matchRule(messageText, rule) {
    try {
      const text = rule.triggerCaseSensitive ? messageText : messageText.toLowerCase();
      const keyword = rule.triggerCaseSensitive ? rule.triggerKeyword : rule.triggerKeyword.toLowerCase();

      // Check exclude keywords first
      if (rule.excludeKeywords && rule.excludeKeywords.length > 0) {
        for (const excludeKeyword of rule.excludeKeywords) {
          const excludeText = rule.triggerCaseSensitive ? excludeKeyword : excludeKeyword.toLowerCase();
          if (text.includes(excludeText)) {
            return false;
          }
        }
      }

      // Match by trigger type
      switch (rule.triggerType) {
        case 'exact':
          return text === keyword;
        case 'contains':
          return text.includes(keyword);
        case 'startsWith':
          return text.startsWith(keyword);
        case 'endsWith':
          return text.endsWith(keyword);
        case 'regex':
          try {
            const regex = new RegExp(keyword);
            return regex.test(text);
          } catch {
            return false;
          }
        default:
          return false;
      }
    } catch (error) {
      logger.error('Error matching rule', { error: error.message });
      return false;
    }
  }

  /**
   * Process a matched auto-reply rule
   */
  static async processRule(rule, phoneNumber, device, companyId, messageQueueService) {
    try {
      // Check if rule has daily limit
      if (rule.isLimited && rule.maxUsagePerDay) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (rule.usageResetDate < today) {
          // Reset usage for new day
          rule.usageToday = 0;
          rule.usageResetDate = new Date();
        }

        if (rule.usageToday >= rule.maxUsagePerDay) {
          logger.info('Auto-reply rule daily limit reached', { ruleId: rule._id.toString() });
          return null;
        }
      }

      // Generate response message with variable substitution
      let responseMessage = rule.responseMessage;
      responseMessage = this.replaceVariables(responseMessage);

      // Get delay (convert from milliseconds)
      const delay = rule.responseDelay || 0;

      // Queue the auto-reply message
      if (messageQueueService) {
        await messageQueueService.addMessage(companyId, {
          deviceId: device._id,
          phoneNumber,
          message: responseMessage,
          type: 'text',
          source: 'auto_reply'
        });
      }

      // Update rule usage
      rule.usageToday += 1;
      rule.lastUsedAt = new Date();
      await rule.save();

      logger.info('Auto-reply message queued', {
        ruleId: rule._id.toString(),
        to: phoneNumber,
        delay
      });

      return {
        success: true,
        ruleId: rule._id,
        phoneNumber,
        responseMessage,
        delay
      };
    } catch (error) {
      logger.error('Failed to process auto-reply rule', {
        ruleId: rule._id.toString(),
        error: error.message
      });
      return null;
    }
  }

  /**
   * Replace variables in response message
   */
  static replaceVariables(message) {
    const now = new Date();

    const replacements = {
      '{{name}}': 'there',
      '{{time}}': now.toLocaleTimeString(),
      '{{date}}': now.toLocaleDateString(),
      '{{day}}': now.toLocaleDateString('en-US', { weekday: 'long' }),
      '{{hour}}': now.getHours().toString().padStart(2, '0'),
      '{{minute}}': now.getMinutes().toString().padStart(2, '0'),
      '{{second}}': now.getSeconds().toString().padStart(2, '0')
    };

    let result = message;
    for (const [variable, value] of Object.entries(replacements)) {
      result = result.replace(new RegExp(variable, 'g'), value);
    }

    return result;
  }

  /**
   * Create a new auto-reply rule
   */
  static async createRule(companyId, deviceId, ruleData) {
    try {
      const rule = new AutoReplyRule({
        companyId,
        deviceId,
        name: ruleData.name,
        description: ruleData.description,
        triggerType: ruleData.triggerType || 'contains',
        triggerKeyword: ruleData.triggerKeyword,
        triggerCaseSensitive: ruleData.triggerCaseSensitive || false,
        responseMessage: ruleData.responseMessage,
        responseDelay: ruleData.responseDelay || 0,
        priority: ruleData.priority || 0,
        isActive: ruleData.isActive !== false,
        maxUsagePerDay: ruleData.maxUsagePerDay,
        excludeKeywords: ruleData.excludeKeywords || [],
        schedule: ruleData.schedule
      });

      await rule.save();
      logger.info('Auto-reply rule created', { ruleId: rule._id.toString() });
      return rule;
    } catch (error) {
      logger.error('Failed to create auto-reply rule', {
        deviceId: deviceId.toString(),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get all rules for a device
   */
  static async getRulesForDevice(deviceId, companyId) {
    try {
      return await AutoReplyRule.find({
        deviceId,
        companyId,
        isActive: true
      }).sort({ priority: -1 });
    } catch (error) {
      logger.error('Failed to get auto-reply rules', {
        deviceId: deviceId.toString(),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update an auto-reply rule
   */
  static async updateRule(ruleId, companyId, updates) {
    try {
      const rule = await AutoReplyRule.findOneAndUpdate(
        { _id: ruleId, companyId },
        updates,
        { new: true, runValidators: true }
      );

      if (!rule) {
        throw new Error('Rule not found');
      }

      logger.info('Auto-reply rule updated', { ruleId: ruleId.toString() });
      return rule;
    } catch (error) {
      logger.error('Failed to update auto-reply rule', {
        ruleId: ruleId.toString(),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Delete an auto-reply rule
   */
  static async deleteRule(ruleId, companyId) {
    try {
      const rule = await AutoReplyRule.findOneAndDelete(
        { _id: ruleId, companyId }
      );

      if (!rule) {
        throw new Error('Rule not found');
      }

      logger.info('Auto-reply rule deleted', { ruleId: ruleId.toString() });
      return rule;
    } catch (error) {
      logger.error('Failed to delete auto-reply rule', {
        ruleId: ruleId.toString(),
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = AutoReplyEngine;
