#!/usr/bin/env node

/**
 * Complete System Verification Script
 * Run this after starting all 4 services to verify everything works
 * Run: node VERIFY_SYSTEM.js
 */

const http = require('http');
const https = require('https');
const { createConnection } = require('redis');

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
  header: (msg) => console.log(`\n${colors.cyan}═══════════════════════════════════════════${colors.reset}\n${colors.cyan}${msg}${colors.reset}\n${colors.cyan}═══════════════════════════════════════════${colors.reset}`),
  section: (msg) => console.log(`\n${colors.blue}→ ${msg}${colors.reset}`),
};

async function testPort(port, name) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/`, (res) => {
      req.abort();
      resolve(true);
    });

    req.on('error', () => {
      resolve(false);
    });

    req.setTimeout(2000);
  });
}

async function testHealthEndpoint() {
  return new Promise((resolve) => {
    http.get('http://localhost:5000/health', (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const health = JSON.parse(data);
            resolve({ success: true, data: health });
          } catch {
            resolve({ success: false, error: 'Invalid JSON response' });
          }
        } else {
          resolve({ success: false, error: `Status ${res.statusCode}` });
        }
      });
    }).on('error', (err) => {
      resolve({ success: false, error: err.message });
    });
  });
}

async function testRedis() {
  return new Promise((resolve) => {
    const client = createConnection({
      host: 'localhost',
      port: 6379,
      socket: {
        reconnectStrategy: () => null
      }
    });

    client.on('error', (err) => {
      resolve({ connected: false, error: err.message });
    });

    client.connect().then(() => {
      client.ping().then((pong) => {
        client.quit().then(() => {
          resolve({ connected: true, pong });
        });
      });
    }).catch((err) => {
      resolve({ connected: false, error: err.message });
    });

    setTimeout(() => {
      resolve({ connected: false, error: 'Connection timeout' });
    }, 3000);
  });
}

async function main() {
  console.clear();
  console.log(`${colors.cyan}
╔═══════════════════════════════════════════════╗
║     WhatsApp SaaS - System Verification       ║
║  Testing all services and dependencies        ║
╚═══════════════════════════════════════════════╝${colors.reset}\n`);

  log.header('1. CHECKING SERVICE PORTS');

  const port3000 = await testPort(3000, 'Frontend');
  const port5000 = await testPort(5000, 'Backend API');

  if (port3000) {
    log.success('Frontend (port 3000) is listening');
  } else {
    log.error('Frontend (port 3000) not found - is Terminal 4 running?');
  }

  if (port5000) {
    log.success('Backend API (port 5000) is listening');
  } else {
    log.error('Backend API (port 5000) not found - is Terminal 2 running?');
  }

  if (port3000 || port5000) {
    log.header('2. TESTING API HEALTH ENDPOINT');

    const health = await testHealthEndpoint();
    if (health.success) {
      log.success('API health check passed');
      log.info(`Status: ${health.data.status}`);
      log.info(`MongoDB: ${health.data.mongodb}`);
      log.info(`Redis: ${health.data.redis}`);
      log.info(`WhatsApp Clients - Total: ${health.data.whatsappClients?.total || 0}, Connected: ${health.data.whatsappClients?.connected || 0}`);
    } else {
      log.error(`API health check failed: ${health.error}`);
    }

    log.header('3. TESTING REDIS CONNECTION');

    const redis = await testRedis();
    if (redis.connected) {
      log.success('Redis is connected');
      log.info(`Ping response: ${redis.pong}`);
    } else {
      log.warn(`Redis not connected: ${redis.error}`);
      log.info('If using Docker, verify: docker run -d -p 6379:6379 redis:latest');
      log.info('If using WSL, start Redis in separate terminal: redis-server');
    }
  }

  log.header('4. FINAL STATUS');

  const allGood = port3000 && port5000;
  const almostGood = port3000 || port5000;

  if (allGood) {
    log.success('🎉 All services are running!');
    log.info('');
    log.info('Next steps:');
    log.info('1. Open browser: http://localhost:3000');
    log.info('2. Click "Register" to create test account');
    log.info('3. Use credentials:');
    log.info('   Email: test@example.com');
    log.info('   Password: Test123456!');
    log.info('4. Go to Devices page and add a WhatsApp device');
    log.info('5. Scan the QR code with WhatsApp');
    log.info('6. Send a test message');
  } else if (almostGood) {
    log.warn('Some services are missing:');
    if (!port3000) log.error('Frontend (port 3000) - Start: cd client && npm run dev');
    if (!port5000) log.error('Backend (port 5000) - Start: npm run dev');
  } else {
    log.error('No services are running!');
    log.info('');
    log.info('Make sure all 4 terminals are open with:');
    log.info('  Terminal 1: redis-server (or docker)');
    log.info('  Terminal 2: npm run dev');
    log.info('  Terminal 3: node src/services/worker/MessageWorker.js');
    log.info('  Terminal 4: cd client && npm run dev');
  }

  log.header('VERIFICATION COMPLETE');

  process.exit(allGood ? 0 : 1);
}

main().catch(err => {
  log.error(`Verification failed: ${err.message}`);
  process.exit(1);
});
