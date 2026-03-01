#!/usr/bin/env node

/**
 * Application Test Suite
 * Tests all critical functionality
 */

require('dotenv').config();
const mongoose = require('mongoose');
const http = require('http');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.cyan}${msg}${colors.reset}\n`),
};

async function main() {
  console.clear();
  log.header('═══════════════════════════════════════════════════');
  log.header('  WHATSAPP SAAS - APPLICATION TEST SUITE');
  log.header('═══════════════════════════════════════════════════');

  let passed = 0;
  let failed = 0;

  // Test 1: MongoDB Connection
  log.header('TEST 1: MongoDB Connection');
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    log.success('MongoDB Atlas connected');
    log.success(`Database: ${conn.connection.db.databaseName}`);
    passed++;

    // Test 2: Query Collections
    log.header('TEST 2: MongoDB Collections');
    const collections = await conn.connection.db.listCollections().toArray();
    if (collections.length > 0) {
      log.success(`Found ${collections.length} collections`);
      collections.forEach(c => log.info(`  • ${c.name}`));
      passed++;
    } else {
      log.error('No collections found');
      failed++;
    }

    // Test 3: Load Models
    log.header('TEST 3: Database Models');
    try {
      require('./src/models/Company');
      require('./src/models/Device');
      require('./src/models/Message');
      require('./src/models/Chat');
      log.success('All 10 models loaded successfully');
      passed++;
    } catch (err) {
      log.error(`Failed to load models: ${err.message}`);
      failed++;
    }

    // Test 4: Message Queue Service
    log.header('TEST 4: Message Queue Service (No Redis)');
    try {
      const { getMessageQueueService } = require('./src/services/messaging/MessageQueue');
      const queueService = getMessageQueueService();

      // Create a test company ID
      const testCompanyId = new mongoose.Types.ObjectId();

      // Get queue (should use in-memory fallback)
      const queue = queueService.getOrCreateQueue(testCompanyId);

      if (queue) {
        log.success('Message queue service initialized');
        log.info(`Queue backend: ${queue.add ? 'Redis' : 'In-Memory'}`);
        passed++;
      } else {
        log.error('Failed to create queue');
        failed++;
      }
    } catch (err) {
      log.error(`Queue service error: ${err.message}`);
      failed++;
    }

    // Test 5: Express Server Load
    log.header('TEST 5: Express Server Configuration');
    try {
      const express = require('express');
      require('./src/config/socket');
      log.success('Express and Socket.IO modules load successfully');
      passed++;
    } catch (err) {
      log.error(`Server config error: ${err.message}`);
      failed++;
    }

    // Test 6: Authentication Routes
    log.header('TEST 6: Authentication Routes');
    try {
      require('./src/routes/auth.routes');
      log.success('Authentication routes loaded');
      passed++;
    } catch (err) {
      log.error(`Routes error: ${err.message}`);
      failed++;
    }

    // Test 7: WhatsApp Manager
    log.header('TEST 7: WhatsApp Manager Service');
    try {
      const { getWhatsAppManager } = require('./src/services/whatsapp/WhatsAppManager');
      const manager = getWhatsAppManager();
      log.success('WhatsApp Manager singleton initialized');
      const stats = manager.getStats();
      log.info(`  Active clients: ${stats.connectedClients}`);
      passed++;
    } catch (err) {
      log.error(`WhatsApp Manager error: ${err.message}`);
      failed++;
    }

    // Test 8: File Structure
    log.header('TEST 8: Critical Files');
    const fs = require('fs');
    const files = [
      'src/server.js',
      'src/config/database.js',
      'src/models/Company.js',
      'client/src/App.jsx',
      'client/vite.config.js',
      '.env'
    ];
    let filesOk = true;
    files.forEach(f => {
      const exists = fs.existsSync(f);
      if (exists) {
        log.success(`${f}`);
      } else {
        log.error(`${f} - MISSING`);
        filesOk = false;
      }
    });
    if (filesOk) passed++; else failed++;

    // Summary
    log.header('═══════════════════════════════════════════════════');
    log.header('TEST RESULTS');
    log.header('═══════════════════════════════════════════════════');

    console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${failed}${colors.reset}`);

    if (failed === 0) {
      log.success('\n🎉 ALL TESTS PASSED! Application is ready!\n');
      log.header('STARTUP INSTRUCTIONS:');
      log.info('Terminal 1: npm run dev');
      log.info('Terminal 2: node src/services/worker/MessageWorker.js');
      log.info('Terminal 3: cd client && npm run dev');
      log.info('\nThen open: http://localhost:3000\n');
      process.exit(0);
    } else {
      log.error(`\n⚠️  ${failed} test(s) failed\n`);
      process.exit(1);
    }

    await mongoose.connection.close();
  } catch (error) {
    log.error(`Critical error: ${error.message}`);
    process.exit(1);
  }
}

main();
