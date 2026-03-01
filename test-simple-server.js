#!/usr/bin/env node

/**
 * Minimal Test Server
 * Tests if basic Express server works
 */

require('dotenv').config();
const express = require('express');
const http = require('http');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(express.json());

// Simple health endpoint
app.get('/health', (req, res) => {
  console.log('✅ Health endpoint called');
  res.json({ status: 'OK', message: 'Server is working' });
});

// Simple test endpoint
app.post('/test', (req, res) => {
  console.log('✅ Test endpoint called');
  console.log('Body:', req.body);
  res.json({ success: true, data: req.body });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({ error: err.message });
});

// Start server
const PORT = 5001; // Different port to avoid conflicts
server.listen(PORT, () => {
  console.log(`\n✅ SIMPLE TEST SERVER RUNNING ON PORT ${PORT}`);
  console.log('\nTry these commands:');
  console.log(`  curl http://localhost:${PORT}/health`);
  console.log(`  curl -X POST http://localhost:${PORT}/test -H "Content-Type: application/json" -d '{"test":"data"}'`);
  console.log('\nPress Ctrl+C to stop\n');
});

// Handle errors
server.on('error', (err) => {
  console.error('❌ Server error:', err.message);
});

process.on('SIGINT', () => {
  console.log('\n✅ Server stopped');
  process.exit(0);
});
