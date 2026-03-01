const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const helmet = require('helmet');
const cors = require('cors');
const dotenv = require('dotenv');
const logger = require('./config/logger');
const { connectMongoDB, connectRedis } = require('./config/database');
const { setupSocket } = require('./config/socket');
const { getWhatsAppManager } = require('./services/whatsapp/WhatsAppManager');
const { setupPassport } = require('./config/passport');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(helmet());
app.use(cors());

// Stripe webhook must receive raw body - register before JSON parser
const webhookRoutes = require('./routes/webhook.routes');
app.use('/webhooks', webhookRoutes);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Passport (OAuth strategies)
setupPassport();

// Store io instance globally for use in routes/services
app.locals.io = io;

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const { getRedisClient, isRedisConnected } = require('./config/database');
    const whatsAppManager = getWhatsAppManager();

    const mongodbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    const redisClient = getRedisClient();
    const redisStatus = isRedisConnected() && redisClient?.isOpen ? 'connected' : 'unavailable';
    const whatsAppStats = whatsAppManager.getStats();

    res.json({
      status: 'OK',
      timestamp: new Date(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      mongodb: mongodbStatus,
      redis: redisStatus,
      whatsappClients: {
        total: whatsAppStats.totalClients,
        connected: whatsAppStats.connectedClients,
        disconnected: whatsAppStats.disconnectedClients
      },
      memory: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      error: error.message
    });
  }
});

// Swagger API Documentation (available at /api-docs)
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'WhatsApp SaaS API Docs',
  swaggerOptions: { persistAuthorization: true }
}));
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

// Routes
const authRoutes = require('./routes/auth.routes');
const deviceRoutes = require('./routes/device.routes');
const messageRoutes = require('./routes/message.routes');
const chatRoutes = require('./routes/chats.routes');
const autoreplyRoutes = require('./routes/autoreply.routes');
const subscriptionRoutes = require('./routes/subscription.routes');
const invoicesRoutes = require('./routes/invoices.routes');
const adminRoutes = require('./routes/admin.routes');
const gdprRoutes = require('./routes/gdpr.routes');
const analyticsRoutes = require('./routes/analytics.routes');

app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/autoreply', autoreplyRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/gdpr', gdprRoutes);
app.use('/api/analytics', analyticsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// Socket.IO setup with namespaces
setupSocket(io);

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Graceful shutdown initiated...');

  try {
    // Close WhatsApp clients
    const whatsAppManager = getWhatsAppManager();
    await whatsAppManager.gracefulShutdown();

    // Close message queues
    const { getMessageQueueService } = require('./services/messaging/MessageQueue');
    const messageQueue = getMessageQueueService();
    await messageQueue.closeAll();

    // Close server
    server.close(() => {
      logger.info('HTTP server closed');
    });

    // Close database connections
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed');
    }

    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', { error: error.message });
    process.exit(1);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
const PORT = process.env.PORT || 5000;
const start = async () => {
  try {
    // Connect to MongoDB
    await connectMongoDB();

    // Connect to Redis (non-blocking)
    connectRedis().catch(err => {
      logger.warn('Redis connection failed - continuing without Redis', { error: err.message });
    });

    // Initialize WhatsApp manager (non-blocking)
    const whatsAppManager = getWhatsAppManager();
    whatsAppManager.initializeAllDevices(io).catch(err => {
      logger.warn('WhatsApp initialization error', { error: err.message });
    });

    // Start server immediately
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`, { env: process.env.NODE_ENV || 'development' });

      // Log WhatsApp status
      const stats = whatsAppManager.getStats();
      logger.info('WhatsApp manager stats', stats);
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
};

start();

module.exports = { app, server, io };
