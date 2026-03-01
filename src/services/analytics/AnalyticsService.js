const mongoose = require('mongoose');
const logger = require('../../config/logger');

class AnalyticsService {
  /**
   * Message volume grouped by day for the past N days
   */
  async getMessageVolumeByDay(companyId, days = 30) {
    const Message = require('../../models/Message');
    const since = new Date();
    since.setDate(since.getDate() - days);

    const data = await Message.aggregate([
      {
        $match: {
          companyId: new mongoose.Types.ObjectId(companyId),
          createdAt: { $gte: since }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          total: { $sum: 1 },
          sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
          delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
          read: { $sum: { $cond: [{ $eq: ['$status', 'read'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    return data.map(d => ({
      date: `${d._id.year}-${String(d._id.month).padStart(2, '0')}-${String(d._id.day).padStart(2, '0')}`,
      total: d.total,
      sent: d.sent,
      delivered: d.delivered,
      read: d.read,
      failed: d.failed,
      deliveryRate: d.total > 0 ? Math.round(((d.delivered + d.read) / d.total) * 100) : 0
    }));
  }

  /**
   * Message status breakdown (pie chart data)
   */
  async getMessageStatusBreakdown(companyId, days = 30) {
    const Message = require('../../models/Message');
    const since = new Date();
    since.setDate(since.getDate() - days);

    const data = await Message.aggregate([
      {
        $match: {
          companyId: new mongoose.Types.ObjectId(companyId),
          createdAt: { $gte: since }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const total = data.reduce((sum, d) => sum + d.count, 0);
    return data.map(d => ({
      status: d._id,
      count: d.count,
      percentage: total > 0 ? Math.round((d.count / total) * 100) : 0
    }));
  }

  /**
   * Hourly message distribution (best time to send)
   */
  async getMessagesByHour(companyId, days = 30) {
    const Message = require('../../models/Message');
    const since = new Date();
    since.setDate(since.getDate() - days);

    const data = await Message.aggregate([
      {
        $match: {
          companyId: new mongoose.Types.ObjectId(companyId),
          createdAt: { $gte: since }
        }
      },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Fill in missing hours with 0
    const byHour = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }));
    data.forEach(d => { byHour[d._id].count = d.count; });
    return byHour;
  }

  /**
   * Device performance stats
   */
  async getDeviceStats(companyId) {
    const Device = require('../../models/Device');
    const Message = require('../../models/Message');

    const [devices, messagesByDevice] = await Promise.all([
      Device.find({ companyId }).lean(),
      Message.aggregate([
        { $match: { companyId: new mongoose.Types.ObjectId(companyId) } },
        {
          $group: {
            _id: '$deviceId',
            total: { $sum: 1 },
            failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } }
          }
        }
      ])
    ]);

    const msgMap = {};
    messagesByDevice.forEach(m => { msgMap[m._id?.toString()] = m; });

    return devices.map(device => {
      const msgs = msgMap[device._id.toString()] || { total: 0, failed: 0 };
      return {
        deviceId: device._id,
        name: device.name,
        phoneNumber: device.phoneNumber,
        status: device.status,
        totalMessages: msgs.total,
        failedMessages: msgs.failed,
        successRate: msgs.total > 0 ? Math.round(((msgs.total - msgs.failed) / msgs.total) * 100) : 0
      };
    });
  }

  /**
   * Auto-reply effectiveness stats
   */
  async getAutoReplyStats(companyId) {
    const AutoReplyRule = require('../../models/AutoReplyRule');
    const rules = await AutoReplyRule.find({ companyId }).lean();

    return rules.map(rule => ({
      ruleId: rule._id,
      name: rule.name,
      trigger: rule.trigger,
      triggerType: rule.triggerType,
      isActive: rule.isActive,
      timesTriggeredToday: rule.usageToday || 0,
      dailyLimit: rule.dailyLimit,
      utilizationRate: rule.dailyLimit > 0
        ? Math.round(((rule.usageToday || 0) / rule.dailyLimit) * 100)
        : null
    }));
  }

  /**
   * Chat inbox summary
   */
  async getChatSummary(companyId) {
    const Chat = require('../../models/Chat');

    const [total, unread, archived] = await Promise.all([
      Chat.countDocuments({ companyId }),
      Chat.countDocuments({ companyId, unreadCount: { $gt: 0 } }),
      Chat.countDocuments({ companyId, isArchived: true })
    ]);

    const recentChats = await Chat.find({ companyId })
      .sort({ lastMessageAt: -1 })
      .limit(5)
      .select('contactName contactNumber lastMessageAt unreadCount')
      .lean();

    return { total, unread, archived, active: total - archived, recentChats };
  }

  /**
   * Usage vs. plan limits
   */
  async getUsageSummary(companyId) {
    const Company = require('../../models/Company');
    const Device = require('../../models/Device');

    const company = await Company.findById(companyId)
      .populate('subscriptionPlan')
      .select('usageStats subscriptionPlan subscriptionEndDate isSubscriptionActive')
      .lean();

    if (!company) return null;

    const deviceCount = await Device.countDocuments({ companyId, status: { $ne: 'deleted' } });
    const plan = company.subscriptionPlan;

    return {
      plan: plan ? { name: plan.name, price: plan.price } : null,
      subscription: {
        isActive: company.isSubscriptionActive,
        endDate: company.subscriptionEndDate,
        daysRemaining: company.subscriptionEndDate
          ? Math.max(0, Math.ceil((new Date(company.subscriptionEndDate) - new Date()) / (1000 * 60 * 60 * 24)))
          : 0
      },
      messages: {
        used: company.usageStats?.messagesThisMonth || 0,
        limit: plan?.maxMessagesPerMonth || 0,
        percentUsed: plan?.maxMessagesPerMonth > 0
          ? Math.round(((company.usageStats?.messagesThisMonth || 0) / plan.maxMessagesPerMonth) * 100)
          : 0
      },
      devices: {
        used: deviceCount,
        limit: plan?.maxDevices || 0,
        percentUsed: plan?.maxDevices > 0
          ? Math.round((deviceCount / plan.maxDevices) * 100)
          : 0
      },
      allTimeMessages: company.usageStats?.totalMessagesAllTime || 0
    };
  }

  /**
   * Full analytics dashboard payload for a company
   */
  async getDashboard(companyId, days = 30) {
    logger.debug('Building analytics dashboard', { companyId, days });

    const [volumeByDay, statusBreakdown, byHour, deviceStats, autoReplyStats, chatSummary, usageSummary] =
      await Promise.all([
        this.getMessageVolumeByDay(companyId, days),
        this.getMessageStatusBreakdown(companyId, days),
        this.getMessagesByHour(companyId, days),
        this.getDeviceStats(companyId),
        this.getAutoReplyStats(companyId),
        this.getChatSummary(companyId),
        this.getUsageSummary(companyId)
      ]);

    return {
      period: { days, since: new Date(Date.now() - days * 24 * 60 * 60 * 1000), until: new Date() },
      volumeByDay,
      statusBreakdown,
      byHour,
      deviceStats,
      autoReplyStats,
      chatSummary,
      usageSummary
    };
  }
}

module.exports = new AnalyticsService();
