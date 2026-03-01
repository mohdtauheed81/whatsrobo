#!/usr/bin/env node

/**
 * Comprehensive Diagnostic Script
 * Tests all services and provides detailed error reporting
 * Run: node DIAGNOSE_AND_FIX.js
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

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

async function checkFile(filePath, name) {
  return new Promise((resolve) => {
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        log.error(`${name} missing at: ${filePath}`);
        resolve(false);
      } else {
        log.success(`${name} found`);
        resolve(true);
      }
    });
  });
}

async function checkBackendFiles() {
  log.header('1. CHECKING BACKEND FILES');

  const files = [
    { path: 'package.json', name: 'Backend package.json' },
    { path: 'src/server.js', name: 'Server entry point' },
    { path: '.env', name: 'Environment variables' },
    { path: 'src/config/database.js', name: 'Database config' },
    { path: 'src/models/Company.js', name: 'Company model' },
    { path: 'src/services/whatsapp/WhatsAppManager.js', name: 'WhatsApp Manager' },
    { path: 'src/services/messaging/MessageQueue.js', name: 'Message Queue' },
    { path: 'src/services/worker/MessageWorker.js', name: 'Message Worker' },
  ];

  let allExist = true;
  for (const file of files) {
    const exists = await checkFile(path.join('F:/git_repo/SaaSWhatsapp', file.path), file.name);
    if (!exists) allExist = false;
  }

  return allExist;
}

async function checkFrontendFiles() {
  log.header('2. CHECKING FRONTEND FILES');

  const files = [
    { path: 'client/package.json', name: 'Frontend package.json' },
    { path: 'client/vite.config.js', name: 'Vite config' },
    { path: 'client/src/index.jsx', name: 'Frontend entry point' },
    { path: 'client/src/App.jsx', name: 'App component' },
  ];

  let allExist = true;
  for (const file of files) {
    const exists = await checkFile(path.join('F:/git_repo/SaaSWhatsapp', file.path), file.name);
    if (!exists) allExist = false;
  }

  return allExist;
}

function checkEnvVariables() {
  log.header('3. CHECKING ENVIRONMENT VARIABLES');

  const envPath = path.join('F:/git_repo/SaaSWhatsapp', '.env');
  const envContent = fs.readFileSync(envPath, 'utf8');

  const required = ['MONGODB_URI', 'REDIS_URL', 'JWT_SECRET', 'PORT'];
  let allSet = true;

  for (const key of required) {
    if (envContent.includes(key)) {
      log.success(`${key} is set`);
    } else {
      log.error(`${key} is NOT set`);
      allSet = false;
    }
  }

  // Check MongoDB connection string
  if (envContent.includes('mongodb+srv://')) {
    log.success('MongoDB Atlas connection configured');
  } else {
    log.error('MongoDB connection not properly configured');
    allSet = false;
  }

  return allSet;
}

async function testHttpServer(port, name) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/health`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          log.success(`${name} is responding on port ${port}`);
          try {
            const json = JSON.parse(data);
            log.info(`Response: ${JSON.stringify(json, null, 2)}`);
          } catch (e) {
            log.info(`Response: ${data}`);
          }
          resolve(true);
        } else {
          log.error(`${name} returned status ${res.statusCode}`);
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      log.error(`${name} not responding on port ${port}: ${err.message}`);
      resolve(false);
    });

    req.setTimeout(3000);
  });
}

async function testConnections() {
  log.header('4. TESTING SERVICE CONNECTIONS');

  log.info('Waiting 2 seconds for services to potentially be available...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  const apiRunning = await testHttpServer(5000, 'Backend API');

  return apiRunning;
}

async function main() {
  console.clear();
  console.log(`${colors.cyan}
╔═══════════════════════════════════════════╗
║  WhatsApp SaaS - Diagnostic & Fix Tool    ║
║  Testing all services and configuration   ║
╚═══════════════════════════════════════════╝${colors.reset}\n`);

  let allGood = true;

  // Check backend files
  const backendFilesOk = await checkBackendFiles();
  if (!backendFilesOk) allGood = false;

  // Check frontend files
  const frontendFilesOk = await checkFrontendFiles();
  if (!frontendFilesOk) allGood = false;

  // Check environment
  const envOk = checkEnvVariables();
  if (!envOk) allGood = false;

  // Test connections
  const apiResponding = await testConnections();
  if (!apiResponding) {
    log.warn('Backend API is not running');
    log.info('This is normal if you haven\'t started "npm run dev" in the root directory yet');
  }

  // Summary
  log.header('5. DIAGNOSTIC SUMMARY');

  if (allGood && apiResponding) {
    log.success('All systems operational! ✅');
    log.info('You can access the application at http://localhost:3000');
  } else if (allGood && !apiResponding) {
    log.warn('Configuration OK, but services not running');
    log.info('\nTo start all services, open 4 terminals and run:');
    log.info('');
    log.info('Terminal 1: redis-server (or skip if using cloud Redis)');
    log.info('');
    log.info('Terminal 2 (in F:\\git_repo\\SaaSWhatsapp):');
    log.info('  npm run dev');
    log.info('');
    log.info('Terminal 3 (in F:\\git_repo\\SaaSWhatsapp):');
    log.info('  node src/services/worker/MessageWorker.js');
    log.info('');
    log.info('Terminal 4 (in F:\\git_repo\\SaaSWhatsapp\\client):');
    log.info('  npm run dev');
    log.info('');
    log.info('Then access: http://localhost:3000');
  } else {
    log.error('Some files or configuration are missing!');
    log.info('Please ensure the project is fully initialized.');
  }

  process.exit(allGood && apiResponding ? 0 : 1);
}

main().catch(err => {
  log.error(`Diagnostic failed: ${err.message}`);
  process.exit(1);
});
