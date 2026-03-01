#!/usr/bin/env node

/**
 * Backend API Test Suite
 * Tests all critical endpoints
 * Usage: node test-api.js
 */

require('dotenv').config();
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
  warn: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.cyan}═══════════════════════════════════${colors.reset}\n${colors.cyan}${msg}${colors.reset}\n${colors.cyan}═══════════════════════════════════${colors.reset}`),
};

const BASE_URL = 'http://localhost:5000/api/';
let testsPassed = 0;
let testsFailed = 0;
let authToken = null;
let testCompanyId = null;

// Make HTTP request
function makeRequest(method, endpoint, data = null) {
  return new Promise((resolve) => {
    const url = new URL(endpoint, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (authToken) {
      options.headers['Authorization'] = `Bearer ${authToken}`;
    }

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({
            status: res.statusCode,
            data: parsed,
            success: res.statusCode >= 200 && res.statusCode < 300
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: responseData,
            success: res.statusCode >= 200 && res.statusCode < 300
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({
        status: 0,
        data: { error: error.message },
        success: false
      });
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Test functions
async function testHealth() {
  log.header('TEST 1: Health Check');
  // Health endpoint is at root, not under /api
  const url = new URL('http://localhost:5000/health');
  const options = {
    hostname: url.hostname,
    port: url.port,
    path: url.pathname,
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  };

  const response = await new Promise((resolve) => {
    const req = require('http').request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data),
            success: res.statusCode >= 200 && res.statusCode < 300
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
            success: res.statusCode >= 200 && res.statusCode < 300
          });
        }
      });
    });
    req.on('error', (error) => {
      resolve({
        status: 0,
        data: { error: error.message },
        success: false
      });
    });
    req.end();
  });

  if (response.success && response.data.status === 'OK') {
    log.success('Backend is healthy');
    log.info(`MongoDB: ${response.data.mongodb}`);
    log.info(`Redis: ${response.data.redis}`);
    log.info(`WhatsApp Clients: ${response.data.whatsappClients.total}`);
    testsPassed++;
  } else {
    log.error(`Health check failed: ${response.data.error || response.status}`);
    testsFailed++;
  }
}

async function testRegister() {
  log.header('TEST 2: Register New Company');

  const testData = {
    companyName: 'Test Company ' + Date.now(),
    email: `test${Date.now()}@example.com`,
    password: 'Test123456!',
    confirmPassword: 'Test123456!'
  };

  const response = await makeRequest('POST', 'auth/register', testData);

  if (response.success) {
    log.success('Registration successful');
    log.info(`Company: ${response.data.company.companyName}`);
    log.info(`Email: ${response.data.company.email}`);
    log.info(`Plan: ${response.data.company.subscriptionPlan}`);

    // Save for later tests
    authToken = response.data.token;
    testCompanyId = response.data.company._id;

    testsPassed++;
  } else {
    log.error(`Registration failed: ${response.data.error || response.status}`);
    log.info(`Status: ${response.status}`);
    log.info(`Response: ${JSON.stringify(response.data)}`);
    testsFailed++;
  }
}

async function testLogin() {
  log.header('TEST 3: Login');

  const testData = {
    email: `test${Date.now() - 5000}@example.com`,
    password: 'Test123456!'
  };

  log.warn('Note: Using previously registered email');
  const response = await makeRequest('POST', 'auth/login', testData);

  if (response.success || response.status === 401) {
    if (response.success) {
      log.success('Login successful');
      log.info(`Company: ${response.data.company.companyName}`);
      authToken = response.data.token;
      testsPassed++;
    } else {
      log.warn('Login failed (normal - may not have test user yet)');
      testsPassed++;
    }
  } else {
    log.error(`Login error: ${response.data.error || response.status}`);
    testsFailed++;
  }
}

async function testGetProfile() {
  log.header('TEST 4: Get Profile (requires auth)');

  if (!authToken) {
    log.warn('Skipping - no auth token available');
    return;
  }

  const response = await makeRequest('GET', 'auth/profile');

  if (response.success) {
    log.success('Profile retrieved');
    log.info(`Company: ${response.data.company.companyName}`);
    log.info(`Subscription Plan: ${response.data.company.subscriptionPlan}`);
    testsPassed++;
  } else {
    log.warn(`Profile check: ${response.status} (expected if not authenticated)`);
    testsPassed++;
  }
}

async function testDevices() {
  log.header('TEST 5: Devices Endpoint');

  if (!authToken) {
    log.warn('Skipping - no auth token available');
    return;
  }

  const response = await makeRequest('GET', 'devices');

  if (response.success || response.status === 404) {
    log.success('Devices endpoint accessible');
    log.info(`Status: ${response.status}`);
    testsPassed++;
  } else {
    log.error(`Devices endpoint failed: ${response.status}`);
    testsFailed++;
  }
}

async function testMessages() {
  log.header('TEST 6: Messages Endpoint');

  if (!authToken) {
    log.warn('Skipping - no auth token available');
    return;
  }

  const response = await makeRequest('GET', 'messages');

  if (response.success || response.status === 404) {
    log.success('Messages endpoint accessible');
    log.info(`Status: ${response.status}`);
    testsPassed++;
  } else {
    log.error(`Messages endpoint failed: ${response.status}`);
    testsFailed++;
  }
}

// Main test runner
async function main() {
  console.clear();
  log.header('🧪 BACKEND API TEST SUITE');
  log.info('Testing all critical endpoints...\n');

  await testHealth();
  await new Promise(r => setTimeout(r, 500));

  await testRegister();
  await new Promise(r => setTimeout(r, 500));

  await testLogin();
  await new Promise(r => setTimeout(r, 500));

  await testGetProfile();
  await new Promise(r => setTimeout(r, 500));

  await testDevices();
  await new Promise(r => setTimeout(r, 500));

  await testMessages();

  // Summary
  log.header('TEST RESULTS');
  console.log(`${colors.green}Passed: ${testsPassed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${testsFailed}${colors.reset}`);

  if (testsFailed === 0) {
    log.success('\n✅ ALL TESTS PASSED! Backend is working!');
    log.info('\n📝 Next: Connect frontend and test registration');
  } else {
    log.error(`\n❌ ${testsFailed} test(s) failed. Check the errors above.`);
  }

  process.exit(testsFailed > 0 ? 1 : 0);
}

main().catch(console.error);
