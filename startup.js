#!/usr/bin/env node

/**
 * Simple Startup Script - Launches all services
 * Usage: node startup.js
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.clear();
console.log(`
╔════════════════════════════════════════════╗
║   WhatsApp SaaS - Startup Script           ║
║   Starting all services...                 ║
╚════════════════════════════════════════════╝
`);

const rootDir = __dirname;
const clientDir = path.join(rootDir, 'client');

let servicesStarted = 0;

// Service 1: Backend API
console.log('🚀 [1/3] Starting Backend API (port 5000)...');
const backend = spawn('npm', ['run', 'dev'], {
  cwd: rootDir,
  stdio: 'pipe',
  shell: true
});

backend.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(`[API] ${output}`);
  if (output.includes('Server running on port 5000')) {
    servicesStarted++;
    if (servicesStarted === 3) {
      console.log(`
╔════════════════════════════════════════════╗
║  ✅ ALL SERVICES STARTED                  ║
╚════════════════════════════════════════════╝

📱 Open your browser:
   http://localhost:8081

⏱️  Wait 5-10 seconds for page to load...

📧 Test Account:
   Email: test@example.com
   Password: Test123456!

════════════════════════════════════════════
      `);
    }
  }
});

backend.stderr.on('data', (data) => {
  const output = data.toString();
  if (!output.includes('WARN') && !output.includes('warn')) {
    console.log(`[API ERR] ${output}`);
  }
});

// Service 2: Message Worker
setTimeout(() => {
  console.log('🚀 [2/3] Starting Message Worker...');
  const worker = spawn('node', ['src/services/worker/MessageWorker.js'], {
    cwd: rootDir,
    stdio: 'pipe',
    shell: true
  });

  worker.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(`[WORKER] ${output}`);
    if (output.includes('Worker started')) {
      servicesStarted++;
      if (servicesStarted === 3) {
        showSuccess();
      }
    }
  });

  worker.stderr.on('data', (data) => {
    console.log(`[WORKER ERR] ${data.toString()}`);
  });
}, 2000);

// Service 3: Frontend
setTimeout(() => {
  console.log('🚀 [3/3] Starting Frontend (port 8081)...');
  const frontend = spawn('npm', ['run', 'dev'], {
    cwd: clientDir,
    stdio: 'pipe',
    shell: true
  });

  frontend.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(`[FRONTEND] ${output}`);
    if (output.includes('Local:') || output.includes('localhost:8081')) {
      servicesStarted++;
      if (servicesStarted === 3) {
        showSuccess();
      }
    }
  });

  frontend.stderr.on('data', (data) => {
    const output = data.toString();
    if (!output.includes('deprecated') && !output.includes('warn')) {
      console.log(`[FRONTEND ERR] ${output}`);
    }
  });
}, 4000);

// Show success message
function showSuccess() {
  console.log(`
╔════════════════════════════════════════════╗
║  ✅ ALL SERVICES STARTED SUCCESSFULLY!    ║
╚════════════════════════════════════════════╝

🌐 URLS:
   Frontend:  http://localhost:8081
   Backend:   http://localhost:5000
   Worker:    Running (background)

📝 TEST ACCOUNT:
   Email:     test@example.com
   Password:  Test123456!

⏱️  Wait 5-10 seconds for frontend to load...

🎉 Ready to use!
════════════════════════════════════════════
  `);
}

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down services...');
  backend.kill();
  worker?.kill?.();
  frontend?.kill?.();
  process.exit(0);
});
