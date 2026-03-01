const Chat = require('../../models/Chat');
const ChatMessage = require('../../models/ChatMessage');
const logger = require('../../config/logger');

class ChatManager {
  /**
   * Handle incoming WhatsApp message and create/update chat
   */
  static async handleIncomingMessage(messageData, device, companyId) {
    try {
      const { from, body, timestamp, id, _data } = messageData;

      // Extract phone number from WhatsApp format
      const phoneNumber = from.replace('@c.us', '').replace('@g.us', '');

      // Find or create chat
      let chat = await Chat.findOne({
        deviceId: device._id,
        whatsappChatId: from,
        companyId
      });

      if (!chat) {
        chat = new Chat({
          companyId,
          deviceId: device._id,
          whatsappChatId: from,
          contactPhoneNumber: phoneNumber,
          contactName: _data.notifyName || phoneNumber,
          contactProfilePicUrl: _data.profilePicThumbBase64
        });
      }

      // Create chat message record
      const chatMessage = new ChatMessage({
        chatId: chat._id,
        companyId,
        whatsappMessageId: id.id,
        sender: 'contact',
        senderPhoneNumber: phoneNumber,
        messageText: body,
        messageType: messageData.type || 'text',
        status: 'received'
      });

      // Save both
      await Promise.all([chat.save(), chatMessage.save()]);

      // Update chat with latest message
      chat.lastMessage = body;
      chat.lastMessageTime = new Date(timestamp * 1000);
      chat.unreadCount += 1;
      await chat.save();

      logger.info('Incoming message handled', {
        companyId: companyId.toString(),
        deviceId: device._id.toString(),
        chatId: chat._id.toString(),
        from: phoneNumber
      });

      return {
        chat,
        chatMessage
      };
    } catch (error) {
      logger.error('Failed to handle incoming message', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get all chats for a company
   */
  static async getCompanyChats(companyId, options = {}) {
    try {
      const { page = 1, limit = 20, includeArchived = false } = options;
      const skip = (page - 1) * limit;

      const query = {
        companyId,
        isArchived: includeArchived,
        isActive: true
      };

      const [chats, total] = await Promise.all([
        Chat.find(query)
          .populate('deviceId', 'phoneNumber status')
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(limit),
        Chat.countDocuments(query)
      ]);

      return {
        chats,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Failed to get company chats', {
        companyId: companyId.toString(),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get messages in a specific chat
   */
  static async getChatMessages(chatId, companyId, options = {}) {
    try {
      const { page = 1, limit = 50 } = options;
      const skip = (page - 1) * limit;

      // Verify ownership
      const chat = await Chat.findOne({ _id: chatId, companyId });
      if (!chat) {
        throw new Error('Chat not found or access denied');
      }

      const [messages, total] = await Promise.all([
        ChatMessage.find({ chatId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        ChatMessage.countDocuments({ chatId })
      ]);

      // Mark all messages as read
      await ChatMessage.updateMany(
        { chatId, isRead: false },
        { isRead: true, readAt: new Date() }
      );

      // Reset unread count
      await Chat.findByIdAndUpdate(chatId, { unreadCount: 0 });

      return {
        chatId: chatId.toString(),
        messages: messages.reverse(),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Failed to get chat messages', {
        chatId: chatId.toString(),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Archive a chat
   */
  static async archiveChat(chatId, companyId) {
    try {
      const chat = await Chat.findOneAndUpdate(
        { _id: chatId, companyId },
        { isArchived: true },
        { new: true }
      );

      if (!chat) {
        throw new Error('Chat not found');
      }

      logger.info('Chat archived', { chatId: chatId.toString() });
      return chat;
    } catch (error) {
      logger.error('Failed to archive chat', {
        chatId: chatId.toString(),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Unarchive a chat
   */
  static async unarchiveChat(chatId, companyId) {
    try {
      const chat = await Chat.findOneAndUpdate(
        { _id: chatId, companyId },
        { isArchived: false },
        { new: true }
      );

      if (!chat) {
        throw new Error('Chat not found');
      }

      logger.info('Chat unarchived', { chatId: chatId.toString() });
      return chat;
    } catch (error) {
      logger.error('Failed to unarchive chat', {
        chatId: chatId.toString(),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Delete a chat
   */
  static async deleteChat(chatId, companyId) {
    try {
      // Soft delete
      const chat = await Chat.findOneAndUpdate(
        { _id: chatId, companyId },
        { isActive: false },
        { new: true }
      );

      if (!chat) {
        throw new Error('Chat not found');
      }

      logger.info('Chat deleted', { chatId: chatId.toString() });
      return chat;
    } catch (error) {
      logger.error('Failed to delete chat', {
        chatId: chatId.toString(),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Add tags to a chat
   */
  static async addTagToChat(chatId, companyId, tag) {
    try {
      const chat = await Chat.findOneAndUpdate(
        { _id: chatId, companyId },
        { $addToSet: { tags: tag } },
        { new: true }
      );

      if (!chat) {
        throw new Error('Chat not found');
      }

      return chat;
    } catch (error) {
      logger.error('Failed to add tag', {
        chatId: chatId.toString(),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Remove tag from chat
   */
  static async removeTagFromChat(chatId, companyId, tag) {
    try {
      const chat = await Chat.findOneAndUpdate(
        { _id: chatId, companyId },
        { $pull: { tags: tag } },
        { new: true }
      );

      if (!chat) {
        throw new Error('Chat not found');
      }

      return chat;
    } catch (error) {
      logger.error('Failed to remove tag', {
        chatId: chatId.toString(),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Search chats by phone number or contact name
   */
  static async searchChats(companyId, searchQuery, options = {}) {
    try {
      const { limit = 10 } = options;

      const chats = await Chat.find({
        companyId,
        isActive: true,
        $or: [
          { contactPhoneNumber: { $regex: searchQuery, $options: 'i' } },
          { contactName: { $regex: searchQuery, $options: 'i' } }
        ]
      })
        .populate('deviceId', 'phoneNumber')
        .limit(limit);

      return chats;
    } catch (error) {
      logger.error('Failed to search chats', {
        companyId: companyId.toString(),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get unread count for all chats
   */
  static async getUnreadCount(companyId) {
    try {
      const unreadCount = await Chat.aggregate([
        { $match: { companyId, isActive: true, isArchived: false } },
        { $group: { _id: null, total: { $sum: '$unreadCount' } } }
      ]);

      return unreadCount[0]?.total || 0;
    } catch (error) {
      logger.error('Failed to get unread count', {
        companyId: companyId.toString(),
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = ChatManager;
