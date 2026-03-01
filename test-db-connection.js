#!/usr/bin/env node

/**
 * Test MongoDB Atlas Connection
 * Run: node test-db-connection.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('./src/config/logger');

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  logger.error('MONGODB_URI not set in .env file');
  process.exit(1);
}

async function testConnection() {
  try {
    logger.info('Testing MongoDB Atlas connection...');
    logger.info('URI: ' + mongoUri.replace(/:[^:]*@/, ':****@')); // Hide password

    const connection = await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      w: 'majority'
    });

    logger.info('✅ MongoDB Atlas connection successful!');
    logger.info(`Database: ${connection.connection.db.databaseName}`);
    logger.info(`Host: ${connection.connection.host}`);
    logger.info(`Collections: ${(await connection.connection.db.listCollections().toArray()).map(c => c.name).join(', ') || 'None yet'}`);

    // Try to list databases
    const admin = connection.connection.db.admin();
    const databases = await admin.listDatabases();
    logger.info(`Available databases: ${databases.databases.map(db => db.name).join(', ')}`);

    await mongoose.connection.close();
    logger.info('✅ Connection closed');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Connection failed:', {
      error: error.message,
      code: error.code,
      errmsg: error.errmsg
    });
    process.exit(1);
  }
}

testConnection();
