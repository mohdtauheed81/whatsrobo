const ClientInstance = require('./ClientInstance');
const Device = require('../../models/Device');
const logger = require('../../config/logger');

class WhatsAppManager {
  constructor() {
    this.clients = new Map(); // Map<deviceId, ClientInstance>
    this.isShuttingDown = false;
  }

  /**
   * Get or create a client instance
   */
  async getOrCreateClient(deviceId, io) {
    try {
      // Return existing client if it exists and is ready
      if (this.clients.has(deviceId.toString())) {
        const clientInstance = this.clients.get(deviceId.toString());
        return clientInstance;
      }

      // Create new client
      const device = await Device.findById(deviceId);
      if (!device) {
        throw new Error('Device not found');
      }

      const clientInstance = new ClientInstance(deviceId, device, io);
      await clientInstance.initialize();

      this.clients.set(deviceId.toString(), clientInstance);
      logger.info('New client created', { deviceId: deviceId.toString() });

      return clientInstance;
    } catch (error) {
      logger.error('Failed to get or create client', { deviceId: deviceId.toString(), error: error.message });
      throw error;
    }
  }

  /**
   * Get client by device ID
   */
  getClient(deviceId) {
    const deviceIdStr = deviceId.toString();
    if (this.clients.has(deviceIdStr)) {
      return this.clients.get(deviceIdStr);
    }
    return null;
  }

  /**
   * Check if device is connected
   */
  isClientConnected(deviceId) {
    const client = this.getClient(deviceId);
    return client && client.isReady;
  }

  /**
   * Destroy a specific client
   */
  async destroyClient(deviceId) {
    try {
      const deviceIdStr = deviceId.toString();
      const clientInstance = this.clients.get(deviceIdStr);

      if (clientInstance) {
        await clientInstance.disconnect();
        this.clients.delete(deviceIdStr);
        logger.info('Client destroyed', { deviceId: deviceIdStr });
      }
    } catch (error) {
      logger.error('Failed to destroy client', { deviceId: deviceId.toString(), error: error.message });
    }
  }

  /**
   * Initialize all connected devices on server start
   */
  async initializeAllDevices(io) {
    try {
      logger.info('Initializing all connected devices...');

      // Find all devices that should be connected
      const connectedDevices = await Device.find({
        status: 'connected',
        isActive: true
      });

      logger.info(`Found ${connectedDevices.length} devices to reconnect`);

      // Initialize each device
      for (const device of connectedDevices) {
        try {
          const clientInstance = new ClientInstance(device._id, device, io);
          await clientInstance.initialize();
          this.clients.set(device._id.toString(), clientInstance);
          logger.info('Device re-initialized', { deviceId: device._id.toString() });
        } catch (error) {
          logger.warn('Failed to re-initialize device', {
            deviceId: device._id.toString(),
            error: error.message
          });

          // Update device status
          await Device.findByIdAndUpdate(
            device._id,
            { status: 'disconnected', errorMessage: error.message }
          );
        }
      }

      logger.info('Device initialization complete', { connectedCount: this.clients.size });
    } catch (error) {
      logger.error('Failed to initialize devices', { error: error.message });
    }
  }

  /**
   * Get all active clients
   */
  getAllClients() {
    return Array.from(this.clients.values());
  }

  /**
   * Get all connected clients
   */
  getConnectedClients() {
    return Array.from(this.clients.values()).filter(client => client.isReady);
  }

  /**
   * Get statistics
   */
  getStats() {
    const allClients = this.getAllClients();
    const connectedClients = this.getConnectedClients();

    return {
      totalClients: allClients.length,
      connectedClients: connectedClients.length,
      disconnectedClients: allClients.length - connectedClients.length,
      clients: allClients.map(client => ({
        deviceId: client.deviceId.toString(),
        isReady: client.isReady,
        reconnectAttempts: client.reconnectAttempts
      }))
    };
  }

  /**
   * Graceful shutdown - close all clients properly
   */
  async gracefulShutdown() {
    try {
      if (this.isShuttingDown) {
        logger.warn('Graceful shutdown already in progress');
        return;
      }

      this.isShuttingDown = true;
      logger.info('Starting graceful shutdown of WhatsApp clients...');

      const shutdownPromises = Array.from(this.clients.entries()).map(([deviceId, clientInstance]) => {
        return clientInstance.disconnect()
          .catch(error => {
            logger.error('Error during client shutdown', { deviceId, error: error.message });
          });
      });

      await Promise.all(shutdownPromises);
      this.clients.clear();

      logger.info('All WhatsApp clients disconnected gracefully');
    } catch (error) {
      logger.error('Error during graceful shutdown', { error: error.message });
    }
  }

  /**
   * Send a message through a specific device
   */
  async sendMessage(deviceId, phoneNumber, messageText) {
    try {
      const client = this.getClient(deviceId);
      if (!client) {
        throw new Error('Device not connected');
      }

      return await client.sendMessage(phoneNumber, messageText);
    } catch (error) {
      logger.error('Failed to send message', {
        deviceId: deviceId.toString(),
        to: phoneNumber,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get all devices for a company
   */
  async getDevicesByCompany(companyId) {
    try {
      const devices = await Device.find({ companyId: companyId }).lean();
      return devices;
    } catch (error) {
      logger.error('Failed to get devices by company', { companyId, error: error.message });
      throw error;
    }
  }

  /**
   * Get a specific device for a company
   */
  async getDevice(deviceId, companyId) {
    try {
      const device = await Device.findOne({ _id: deviceId, companyId: companyId }).lean();
      return device;
    } catch (error) {
      logger.error('Failed to get device', { deviceId, companyId, error: error.message });
      throw error;
    }
  }

  /**
   * Create a new device for a company
   */
  async createDevice(companyId, deviceName = null) {
    try {
      // Count existing devices to generate a default name
      const deviceCount = await Device.countDocuments({ companyId: companyId });
      const name = deviceName || `Device ${deviceCount + 1}`;

      const device = new Device({
        companyId: companyId,
        name: name,
        status: 'disconnected',
        isActive: true
      });

      await device.save();
      logger.info('Device created', { deviceId: device._id.toString(), companyId, name });

      return device.toObject();
    } catch (error) {
      logger.error('Failed to create device', { companyId, error: error.message });
      throw error;
    }
  }

  /**
   * Disconnect a device
   */
  async disconnectDevice(deviceId, companyId) {
    try {
      const device = await Device.findOne({ _id: deviceId, companyId: companyId });

      if (!device) {
        throw new Error('Device not found');
      }

      // Destroy the client if it exists
      await this.destroyClient(deviceId);

      // Update device status
      device.status = 'disconnected';
      device.lastConnected = new Date();
      await device.save();

      logger.info('Device disconnected', { deviceId: deviceId.toString(), companyId });

      return device.toObject();
    } catch (error) {
      logger.error('Failed to disconnect device', { deviceId, companyId, error: error.message });
      throw error;
    }
  }

  /**
   * Delete a device
   */
  async deleteDevice(deviceId, companyId) {
    try {
      const device = await Device.findOne({ _id: deviceId, companyId: companyId });

      if (!device) {
        throw new Error('Device not found');
      }

      // Destroy the client if it exists
      await this.destroyClient(deviceId);

      // Delete the device
      await Device.findByIdAndDelete(deviceId);

      logger.info('Device deleted', { deviceId: deviceId.toString(), companyId });

      return { success: true };
    } catch (error) {
      logger.error('Failed to delete device', { deviceId, companyId, error: error.message });
      throw error;
    }
  }
}

// Singleton instance
let instance = null;

const getWhatsAppManager = () => {
  if (!instance) {
    instance = new WhatsAppManager();
  }
  return instance;
};

module.exports = {
  WhatsAppManager,
  getWhatsAppManager
};
