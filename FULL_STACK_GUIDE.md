# WhatsApp SaaS Platform - Full Stack Guide

Complete guide to running the **full stack** application (Backend API + Frontend UI).

## 📋 Complete Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    USER BROWSER                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  React App (Port 3000)                               │  │
│  │  ├── Dashboard (User & Admin)                        │  │
│  │  ├── Device Management                              │  │
│  │  ├── Message Sending                                │  │
│  │  ├── Chat Inbox                                     │  │
│  │  └── Subscription Management                        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
          ↓ HTTP + WebSocket              ↑
┌─────────────────────────────────────────────────────────────┐
│                   NODE.JS API SERVER (Port 5000)             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Express.js with Socket.IO                           │  │
│  │  ├── Auth Routes (/api/auth/...)                     │  │
│  │  ├── Device Routes (/api/devices)                    │  │
│  │  ├── Message Routes (/api/messages)                  │  │
│  │  ├── Chat Routes (/api/chats)                        │  │
│  │  └── Subscription Routes (/api/subscription)        │  │
│  ├── Services (Business Logic)                          │  │
│  │  ├── WhatsAppManager (Client instances)              │  │
│  │  ├── MessageQueue (Bull + Redis)                     │  │
│  │  ├── ChatManager & AutoReplyEngine                   │  │
│  │  └── InvoiceGenerator & UsageTracker                 │  │
│  └── Socket.IO Namespaces                               │  │
│     ├── /device (QR, status)                            │  │
│     └── /chat (messages, typing)                        │  │
└─────────────────────────────────────────────────────────────┘
     ↓ Mongoose & Redis  ↓  whatsapp-web.js
┌──────────────────────┬──────────────────────────────────────┐
│   MONGODB            │   REDIS                              │
│   ┌────────────────┐ │   ┌─────────────────────────────────┐│
│   │ • Companies    │ │   │ Bull Message Queues             ││
│   │ • Devices      │ │   │ Rate Limiting Tokens             ││
│   │ • Messages     │ │   │ Session Cache                    ││
│   │ • Chats        │ │   │ Job Status Tracking              ││
│   │ • Invoices     │ │   └─────────────────────────────────┘│
│   │ • Plans        │ │                                      │
│   │ • AutoReplies  │ │   PM2 PROCESSES                      │
│   └────────────────┘ │   ┌─────────────────────────────────┐│
│                      │   │ • API Server (Cluster Mode)      ││
│                      │   │ • Message Worker (Fork Mode)     ││
│                      │   │ • Cron Job (Monthly Reset)       ││
│                      │   └─────────────────────────────────┘│
└──────────────────────┴──────────────────────────────────────┘
          ↓ Local Auth Sessions
┌────────────────────────────────────────────────────────────┐
│  WHATSAPP CLIENTS (whatsapp-web.js)                        │
│  ├── Device 1: Connected ✓                                │
│  ├── Device 2: Connecting...                              │
│  ├── Device 3: QR Pending                                 │
│  └── Device N: Auto-reconnecting                          │
└────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start (Complete Setup)

### Prerequisites
- Node.js >= 16
- MongoDB 5.0+
- Redis 6.0+
- Git

### 1. Install & Setup Backend

```bash
cd F:\git_repo\SaaSWhatsapp

# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Configure .env with your values:
# - MONGODB_URI
# - REDIS_URL
# - JWT_SECRET
# - etc.

# Seed subscription plans
npm run seed

# Start MongoDB & Redis in separate terminals
mongod
redis-server
```

### 2. Install & Setup Frontend

```bash
cd client

# Install dependencies
npm install

# Setup environment
cp .env.example .env

# .env should contain:
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

### 3. Start Services (Open 5 terminals)

**Terminal 1: MongoDB**
```bash
mongod
```

**Terminal 2: Redis**
```bash
redis-server
```

**Terminal 3: API Server**
```bash
cd /path/to/project
npm run dev
# Listens on http://localhost:5000
```

**Terminal 4: Message Worker**
```bash
cd /path/to/project
node src/services/worker/MessageWorker.js
```

**Terminal 5: Frontend**
```bash
cd client
npm run dev
# Opens http://localhost:3000
```

## 📱 Using the Application

### First Time Setup

1. **Open Browser**
   - Navigate to http://localhost:3000

2. **Register Company**
   - Click "Register" on login page
   - Enter company name, email, password
   - Receive default Starter plan

3. **Add WhatsApp Device**
   - Go to Devices page
   - Click "Add Device"
   - Enter device name
   - Scan QR code with WhatsApp
   - Wait for connection (30-60 seconds)

4. **Send First Message**
   - Go to Messages page
   - Select connected device
   - Enter phone number (international format)
   - Type message
   - Click Send
   - Watch real-time status updates

### Key Workflows

**Send Bulk Messages:**
1. Prepare Excel file: Column A = Phone | Column B = Message | Column C = Name
2. Go to Messages → Bulk Send
3. Select device and upload file
4. Monitor progress in real-time
5. Download report when complete

**View Chat History:**
1. Go to Chats page
2. Click on contact to view conversation
3. Messages load with timestamps
4. Archive or delete if needed

**Manage Subscription:**
1. Go to Subscription page
2. View current plan and limits
3. See usage statistics
4. Upgrade plan if needed
5. Download invoices

**Admin Functions:**
1. Login as admin user (if role exists)
2. Go to /admin/dashboard
3. View platform statistics
4. Manage companies in Companies tab
5. Edit plans in Plans tab

## 🔧 Environment Configuration

### Backend (.env)

```env
# Server
NODE_ENV=development
PORT=5000

# Database
MONGODB_URI=mongodb://localhost:27017/whatsapp_saas
MONGODB_POOL_SIZE=10

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_very_secret_key_change_in_production
JWT_EXPIRY=7d

# WhatsApp
MAX_RECONNECT_ATTEMPTS=5
SESSION_PATH=./sessions

# Rate Limiting
MESSAGES_PER_MINUTE=20
GLOBAL_MESSAGE_DELAY=1000

# Logging
LOG_LEVEL=info
LOG_DIR=./logs
```

### Frontend (.env)

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

## 📊 API Endpoints Reference

### Authentication
```
POST   /api/auth/register          # Register company
POST   /api/auth/login             # Login
POST   /api/auth/refresh-token     # Refresh JWT
GET    /api/auth/profile           # Get company profile
PUT    /api/auth/profile           # Update profile
POST   /api/auth/logout            # Logout
```

### Devices
```
GET    /api/devices                # List devices
POST   /api/devices                # Create device
DELETE /api/devices/:id            # Delete device
GET    /api/devices/:id            # Get device details
POST   /api/devices/:id/reconnect  # Manually reconnect
```

### Messages
```
POST   /api/messages/send          # Send single message
GET    /api/messages               # List messages
POST   /api/messages/bulk/upload   # Upload Excel
GET    /api/messages/bulk/status   # Check bulk status
GET    /api/messages/bulk/report   # Get bulk report
```

### Chats
```
GET    /api/chats                  # List chats
GET    /api/chats/:id              # Get chat details
GET    /api/chats/:id/messages     # Get chat messages
POST   /api/chats/:id/archive      # Archive chat
DELETE /api/chats/:id              # Delete chat
```

### Subscriptions & Billing
```
GET    /api/plans                  # List subscription plans
POST   /api/subscription/subscribe # Subscribe to plan
POST   /api/subscription/renew     # Renew subscription
GET    /api/usage                  # Get usage statistics
GET    /api/invoices               # List invoices
GET    /api/invoices/:id/download  # Download invoice PDF
```

### Admin
```
GET    /api/admin/dashboard        # Platform stats
GET    /api/admin/companies        # List companies
PUT    /api/admin/companies/:id    # Update company
DELETE /api/admin/companies/:id    # Delete company
GET    /api/admin/plans            # List plans
POST   /api/admin/plans            # Create plan
PUT    /api/admin/plans/:id        # Update plan
DELETE /api/admin/plans/:id        # Delete plan
```

### Health
```
GET    /health                     # Health check with details
```

## 🔄 Real-Time Communication

### Device Namespace (`/device`)
```javascript
// Client listens for:
socket.on('qr_code', (data) => {
  // data: { deviceId, qrCode (data URL), expiresIn }
});

socket.on('status_change', (data) => {
  // data: { deviceId, status: 'connected'|'disconnected'|'connecting' }
});

socket.on('connection_error', (data) => {
  // data: { deviceId, error, message }
});

// Client emits:
socket.emit('subscribe_device', { deviceId });
socket.emit('unsubscribe_device', { deviceId });
socket.emit('request_qr', { deviceId });
```

### Chat Namespace (`/chat`)
```javascript
// Client listens for:
socket.on('new_message', (data) => {
  // data: { deviceId, from, contactName, message, timestamp }
});

socket.on('message_status', (data) => {
  // data: { whatsappMessageId, status: 'sent'|'delivered'|'read' }
});

// Client emits:
socket.emit('subscribe_company', { companyId });
socket.emit('subscribe_chat', { chatId });
socket.emit('typing', { chatId, isTyping: true|false });
```

## 📈 Monitoring & Debugging

### View Server Logs
```bash
tail -f logs/combined.log          # All logs
tail -f logs/error.log             # Errors only
pm2 logs whatsapp-api              # API logs
pm2 logs whatsapp-worker           # Worker logs
```

### Check Health
```bash
# In browser
curl http://localhost:5000/health

# Response includes MongoDB, Redis, WhatsApp client status
```

### Monitor Queues
```javascript
// In Node REPL
const api = require('./src/services/api');
const status = await api.getQueueStatus(companyId);
console.log(status);
// Shows: waiting, active, completed, failed counts
```

### Check Connected Devices
```bash
# In MongoDB client
db.devices.find({ status: 'connected' })

# Count active connections
db.devices.countDocuments({ status: 'connected' })
```

## 🐛 Troubleshooting

### WhatsApp Device Not Connecting
1. Check internet connectivity
2. Verify WhatsApp not logged in elsewhere
3. Check logs: `tail -f logs/error.log`
4. QR code expires in 60 seconds - rescan quickly
5. Try different browser if QR not displaying

### Messages Not Sending
1. Check device status is "connected"
2. Verify subscription not expired
3. Check monthly message limit not exceeded
4. Check message format (valid phone number)
5. Review worker logs for send errors

### API Returning 401
1. Token may be expired - login again
2. Check localStorage for token in browser
3. Verify JWT_SECRET in .env matches

### Redis/Queue Issues
1. Ensure Redis is running: `redis-cli ping`
2. Check REDIS_URL in .env
3. Clear queue if stuck: `redis-cli FLUSHDB`

### WebSocket Connection Failed
1. Check Socket.IO server running on backend
2. Verify REACT_APP_SOCKET_URL in frontend .env
3. Check firewall/proxy settings
4. Browser console will show connection errors

## 🚀 Production Deployment

### Backend Deployment
```bash
# Set NODE_ENV=production in .env
# Use PM2 for process management
pm2 start pm2.config.js

# Configure reverse proxy (Nginx)
# Set up SSL/TLS certificates
# Configure CORS for frontend domain
# Use external MongoDB Atlas
# Use managed Redis (ElastiCache, Redis Cloud)
```

### Frontend Deployment
```bash
# Build production bundle
npm run build

# Deploy dist/ folder to:
# - Vercel
# - Netlify
# - AWS S3 + CloudFront
# - GitHub Pages
# - Traditional hosting

# Configure environment variables for production API
```

## 📚 Additional Resources

- **Backend README**: `/README.md`
- **Frontend README**: `/client/README.md`
- **Implementation Plan**: `/IMPLEMENTATION_SUMMARY.md`
- **Testing Guide**: `/TESTING.md`
- **Deployment Guide**: `/DEPLOYMENT.md`
- **UI Guide**: `/UI_GUIDE.md`
- **whatsapp-web.js**: https://wwebjs.dev/

## 📝 Development Workflow

1. **Development**
   - Run all services locally
   - Make code changes
   - Test in browser at localhost:3000
   - Check logs for errors

2. **Testing**
   - Use manual test checklist in TESTING.md
   - Test auth flows
   - Test device setup
   - Send test messages
   - Verify real-time updates

3. **Staging**
   - Deploy to staging server
   - Run full integration tests
   - Test with real WhatsApp account
   - Load testing

4. **Production**
   - Final QA
   - Database backup
   - Configure monitoring
   - Set up alerting
   - Deploy via CI/CD

## ✅ Verification Checklist

- [ ] MongoDB running and accessible
- [ ] Redis running and accessible
- [ ] Backend API started (port 5000)
- [ ] Message worker started
- [ ] Frontend running (port 3000)
- [ ] Can register new company
- [ ] Can add WhatsApp device
- [ ] QR code displays properly
- [ ] Device connects and shows "connected"
- [ ] Can send message
- [ ] Message status updates in real-time
- [ ] Admin panel accessible
- [ ] Health check returns 200
- [ ] No console errors in browser
- [ ] No error logs on backend

## 🎉 You're Ready!

The full WhatsApp SaaS platform is now running with:
- ✅ User authentication & authorization
- ✅ Multi-device WhatsApp management
- ✅ Message sending with real-time status
- ✅ Bulk messaging capabilities
- ✅ Chat inbox with history
- ✅ Auto-reply system
- ✅ Subscription management
- ✅ Invoice generation
- ✅ Admin dashboard
- ✅ Real-time WebSocket updates

All components are integrated and working together!
