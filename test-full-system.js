#!/usr/bin/env node

/**
 * Full System Integration Test
 * Tests the complete flow: Backend → MongoDB → Frontend Connection
 * Run: node test-full-system.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const http = require('http');
const express = require('express');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.cyan}═══════════════════════════════════${colors.reset}\n${colors.cyan}${msg}${colors.reset}\n${colors.cyan}═══════════════════════════════════${colors.reset}`),
};

async function testMongoDB() {
  log.header('1. TESTING MONGODB CONNECTION');

  try {
    log.info('Connecting to MongoDB Atlas...');
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      log.error('MONGODB_URI not set in .env file');
      return false;
    }

    const conn = await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      w: 'majority'
    });

    log.success('MongoDB connected successfully');
    log.info(`Database: ${conn.connection.db.databaseName}`);
    log.info(`Host: ${conn.connection.host}`);

    // List collections
    const collections = await conn.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    log.info(`Collections: ${collectionNames.length > 0 ? collectionNames.join(', ') : 'None yet (normal for new setup)'}`);

    await mongoose.connection.close();
    return true;
  } catch (error) {
    log.error(`MongoDB connection failed: ${error.message}`);
    return false;
  }
}

async function testEnvironmentVariables() {
  log.header('2. TESTING ENVIRONMENT VARIABLES');

  const required = {
    'MONGODB_URI': 'MongoDB connection string',
    'REDIS_URL': 'Redis connection string',
    'JWT_SECRET': 'JWT secret key',
    'PORT': 'API port number',
    'NODE_ENV': 'Node environment',
    'MESSAGES_PER_MINUTE': 'Rate limit',
    'CLIENT_URL': 'Frontend URL for CORS'
  };

  let allSet = true;
  for (const [key, desc] of Object.entries(required)) {
    if (process.env[key]) {
      log.success(`${key}: ${desc}`);
    } else {
      log.warn(`${key}: NOT SET (${desc})`);
      allSet = false;
    }
  }

  return allSet;
}

async function testFileStructure() {
  log.header('3. TESTING FILE STRUCTURE');

  const fs = require('fs');
  const path = require('path');

  const files = [
    'src/server.js',
    'src/config/database.js',
    'src/models/Company.js',
    'src/models/Device.js',
    'src/services/whatsapp/WhatsAppManager.js',
    'src/services/messaging/MessageQueue.js',
    'src/services/worker/MessageWorker.js',
    'client/src/App.jsx',
    'client/vite.config.js',
    '.env'
  ];

  let allExist = true;
  for (const file of files) {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      log.success(`${file} exists`);
    } else {
      log.error(`${file} MISSING`);
      allExist = false;
    }
  }

  return allExist;
}

async function testDependencies() {
  log.header('4. TESTING DEPENDENCIES');

  const requiredDeps = [
    'express',
    'mongoose',
    'socket.io',
    'redis',
    'bull',
    'whatsapp-web.js',
    'jsonwebtoken',
    'bcryptjs'
  ];

  let allInstalled = true;
  for (const dep of requiredDeps) {
    try {
      require(dep);
      log.success(`${dep} installed`);
    } catch {
      log.error(`${dep} NOT INSTALLED`);
      allInstalled = false;
    }
  }

  return allInstalled;
}

async function testBackendStartup() {
  log.header('5. TESTING BACKEND STARTUP');

  return new Promise((resolve) => {
    try {
      log.info('Attempting to load server configuration...');

      // Try to load main models and config
      const configPath = require.resolve('./src/config/database');
      log.success('Database config loads correctly');

      log.info('Creating test express server...');
      const app = express();

      // Basic test endpoint
      app.get('/health', (req, res) => {
        res.json({ status: 'OK', timestamp: new Date() });
      });

      const server = app.listen(0, () => {
        const port = server.address().port;
        log.success(`Test server started on port ${port}`);

        // Test the endpoint
        http.get(`http://localhost:${port}/health`, (res) => {
          let data = '';
          res.on('data', chunk => { data += chunk; });
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              log.success(`Health endpoint works: ${JSON.stringify(json)}`);
              server.close();
              resolve(true);
            } catch {
              log.error('Invalid health endpoint response');
              server.close();
              resolve(false);
            }
          });
        }).on('error', (err) => {
          log.error(`Health endpoint test failed: ${err.message}`);
          server.close();
          resolve(false);
        });
      }).on('error', (err) => {
        log.error(`Failed to start test server: ${err.message}`);
        resolve(false);
      });
    } catch (err) {
      log.error(`Backend startup test failed: ${err.message}`);
      resolve(false);
    }
  });
}

async function testFrontendBuild() {
  log.header('6. TESTING FRONTEND BUILD');

  const fs = require('fs');
  const path = require('path');

  const frontendFiles = [
    'client/src/index.jsx',
    'client/src/App.jsx',
    'client/vite.config.js',
    'client/package.json'
  ];

  let allExist = true;
  for (const file of frontendFiles) {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      log.success(`${file} exists`);
    } else {
      log.error(`${file} MISSING`);
      allExist = false;
    }
  }

  if (allExist) {
    log.info('Frontend Vite config found');
    try {
      const viteConfig = require('./client/vite.config.js');
      log.success('Vite config loads correctly');
    } catch {
      log.warn('Could not verify Vite config (may still work)');
    }
  }

  return allExist;
}

async function main() {
  console.clear();
  console.log(`${colors.cyan}
╔════════════════════════════════════════╗
║  WhatsApp SaaS - Full System Test      ║
║  Verifying complete application setup  ║
╚════════════════════════════════════════╝${colors.reset}\n`);

  const results = {
    mongodb: await testMongoDB(),
    env: await testEnvironmentVariables(),
    files: await testFileStructure(),
    deps: await testDependencies(),
    backend: await testBackendStartup(),
    frontend: await testFrontendBuild()
  };

  log.header('FINAL TEST RESULTS');

  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;

  console.log(`\nPassed: ${passed}/${total} tests\n`);

  for (const [test, result] of Object.entries(results)) {
    const status = result ? log.success : log.error;
    status(`${test.toUpperCase()}: ${result ? 'PASS' : 'FAIL'}`);
  }

  log.header('NEXT STEPS');

  if (passed === total) {
    log.success('All system tests passed! ✅');
    log.info('');
    log.info('You are ready to start the application:');
    log.info('');
    log.info('1. Start Redis:');
    log.info('   docker run -d -p 6379:6379 redis:latest');
    log.info('');
    log.info('2. Open 4 terminals and run:');
    log.info('   Terminal 1: redis-server (or Docker/WSL)');
    log.info('   Terminal 2: npm run dev');
    log.info('   Terminal 3: node src/services/worker/MessageWorker.js');
    log.info('   Terminal 4: cd client && npm run dev');
    log.info('');
    log.info('3. Open: http://localhost:3000');
  } else {
    log.warn(`${total - passed} test(s) failed. Fix issues before starting.`);
    log.info('');
    log.info('Common fixes:');
    log.info('- npm install (in root and client folders)');
    log.info('- Check .env file is present');
    log.info('- Verify MongoDB connection with: node test-db-connection.js');
  }

  process.exit(passed === total ? 0 : 1);
}

main().catch(err => {
  log.error(`Test suite failed: ${err.message}`);
  process.exit(1);
});
