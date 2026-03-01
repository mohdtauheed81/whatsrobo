const mongoose = require('mongoose');
const redis = require('redis');
const logger = require('./logger');
require('dotenv').config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp_saas';
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const poolSize = parseInt(process.env.MONGODB_POOL_SIZE || '10');

// MongoDB Connection
const connectMongoDB = async () => {
  try {
    await mongoose.connect(mongoUri, {
      maxPoolSize: poolSize,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      w: 'majority'
    });
    logger.info('MongoDB connected successfully', { uri: mongoUri.replace(/:[^:]*@/, ':***@') });
    return mongoose.connection;
  } catch (error) {
    logger.error('MongoDB connection failed', { error: error.message });
    setTimeout(connectMongoDB, 5000);
  }
};

// Redis Connection (Optional for development)
let redisClient = null;
let redisConnected = false;

const connectRedis = async () => {
  try {
    redisClient = redis.createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: () => null  // Don't reconnect - fail fast
      }
    });

    redisClient.on('error', (error) => {
      // Silently fail - use in-memory fallback
      redisConnected = false;
    });

    // Try to connect with timeout
    const connectPromise = redisClient.connect();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Redis connection timeout')), 2000)
    );

    await Promise.race([connectPromise, timeoutPromise]);
    redisConnected = true;
    logger.info('Redis connected successfully', { url: redisUrl.replace(/:[^:]*@/, ':***@') });
    return redisClient;
  } catch (error) {
    // Silent failure - use in-memory fallback
    redisConnected = false;
    redisClient = null;
    return null;
  }
};

// Handle connection events
mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

mongoose.connection.on('error', (error) => {
  logger.error('MongoDB error', { error: error.message });
});

module.exports = {
  connectMongoDB,
  connectRedis,
  getRedisClient: () => redisClient,
  isRedisConnected: () => redisConnected,
  mongoose
};
