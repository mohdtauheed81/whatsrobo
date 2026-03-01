# WhatsApp SaaS Platform

A production-ready multi-tenant WhatsApp SaaS platform that allows companies to manage WhatsApp messaging at scale.

## Features

- **Multi-Tenant Architecture**: Support for 500+ companies with complete data isolation
- **Multiple WhatsApp Devices**: Up to 5 WhatsApp devices per company
- **Message Management**: Send messages (manual, bulk, OTP, notifications) with rate limiting
- **Inbox System**: Receive and manage incoming chats with auto-reply capability
- **Subscription Plans**: Three-tier pricing (Starter, Professional, Enterprise)
- **Message History**: Track all message history with detailed status updates
- **Invoicing**: Automated invoice generation with PDF export
- **Real-Time Updates**: Socket.IO integration for live QR codes and message status
- **Bulk Messaging**: Upload Excel files to send messages to multiple contacts
- **Auto-Reply**: Keyword-based automatic responses with variable substitution
- **Message Queue**: Bull-based queue with rate limiting and retry logic
- **Production Ready**: PM2 configuration, graceful shutdown, health checks, comprehensive logging

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: MongoDB
- **Cache/Queue**: Redis + Bull
- **Real-Time**: Socket.IO
- **WhatsApp Integration**: whatsapp-web.js
- **Authentication**: JWT
- **PDF Generation**: PDFKit
- **File Upload**: Multer
- **Excel Parsing**: ExcelJS
- **Process Management**: PM2
- **Logging**: Winston

## Project Structure

```
src/
├── config/              # Configuration files
│   ├── database.js     # MongoDB and Redis setup
│   ├── logger.js       # Winston logger configuration
│   └── socket.js       # Socket.IO namespace setup
├── models/             # Mongoose schemas
│   ├── Company.js
│   ├── Device.js
│   ├── Message.js
│   ├── Chat.js
│   ├── ChatMessage.js
│   ├── AutoReplyRule.js
│   ├── SubscriptionPlan.js
│   ├── Invoice.js
│   ├── MessageQueue.js
│   └── BulkMessage.js
├── controllers/        # Request handlers
│   └── AuthController.js
├── routes/            # API route definitions
│   └── auth.routes.js
├── services/          # Business logic
│   ├── whatsapp/
│   │   ├── WhatsAppManager.js    # Singleton client manager
│   │   └── ClientInstance.js     # Individual client wrapper
│   ├── messaging/
│   │   ├── MessageQueue.js       # Bull queue management
│   │   └── BulkMessageHandler.js # Bulk operations
│   ├── chat/
│   │   ├── ChatManager.js        # Chat operations
│   │   └── AutoReplyEngine.js    # Auto-reply logic
│   ├── subscription/
│   │   ├── UsageTracker.js       # Usage tracking
│   │   └── InvoiceGenerator.js   # Invoice PDF generation
│   └── worker/
│       └── MessageWorker.js      # Message queue processor
├── middleware/        # Custom middleware
│   ├── auth.js
│   └── validateSubscription.js
├── utils/            # Utility functions
│   └── excelParser.js
├── socket/           # Socket.IO handlers
├── jobs/             # Scheduled jobs
│   └── usageResetJob.js
└── server.js         # Main application entry point

scripts/
├── seedSubscriptionPlans.js      # Database seeding

tests/                # Test files (to be added)
```

## Installation

### Prerequisites

- Node.js >= 16
- MongoDB >= 5.0
- Redis >= 6.0
- NPM or Yarn

### Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd whatsapp-saas
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
NODE_ENV=development
PORT=5000

MONGODB_URI=mongodb://localhost:27017/whatsapp_saas
REDIS_URL=redis://localhost:6379

JWT_SECRET=your_secure_secret_key_here
JWT_EXPIRY=7d

MAX_RECONNECT_ATTEMPTS=5
SESSION_PATH=./sessions

MESSAGES_PER_MINUTE=20
GLOBAL_MESSAGE_DELAY=1000
```

4. **Seed subscription plans**
```bash
npm run seed
```

5. **Start MongoDB and Redis**
```bash
# MongoDB
mongod

# Redis
redis-server
```

6. **Start the application**

Development:
```bash
npm run dev
```

Production:
```bash
npm start
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new company
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh-token` - Refresh JWT token
- `GET /api/auth/profile` - Get company profile
- `PUT /api/auth/profile` - Update company profile
- `POST /api/auth/logout` - Logout

### Devices

- `POST /api/devices` - Create WhatsApp device
- `GET /api/devices` - List company devices
- `GET /api/devices/:id` - Get device details
- `DELETE /api/devices/:id` - Delete device
- `POST /api/devices/:id/reconnect` - Reconnect device

### Messages

- `POST /api/messages/send` - Send single message
- `POST /api/messages/bulk/upload` - Upload Excel for bulk sending
- `GET /api/messages/bulk/status/:jobId` - Get bulk job status
- `GET /api/messages/bulk/report/:bulkId` - Get bulk report
- `GET /api/messages` - List messages with pagination

### Chats

- `GET /api/chats` - List company chats
- `GET /api/chats/:id` - Get chat details
- `GET /api/chats/:id/messages` - Get chat messages
- `POST /api/chats/:id/archive` - Archive chat
- `DELETE /api/chats/:id` - Delete chat

### Auto-Reply

- `POST /api/auto-reply` - Create auto-reply rule
- `GET /api/auto-reply` - List auto-reply rules
- `PUT /api/auto-reply/:id` - Update rule
- `DELETE /api/auto-reply/:id` - Delete rule

### Subscriptions

- `GET /api/plans` - List subscription plans
- `POST /api/subscription/subscribe` - Purchase/upgrade plan
- `POST /api/subscription/renew` - Renew subscription
- `GET /api/usage` - Get usage statistics

### Invoices

- `GET /api/invoices` - List invoices
- `GET /api/invoices/:id` - Get invoice details
- `GET /api/invoices/:id/download` - Download invoice PDF

### Admin

- `GET /health` - Health check with detailed status

## Socket.IO Events

### Device Namespace (`/device`)

**Emitted by server:**
- `qr_code` - New QR code for scanning
- `status_change` - Device connection status changed
- `connection_error` - Connection error occurred

**Expected from client:**
- `subscribe_device` - Subscribe to device updates
- `unsubscribe_device` - Unsubscribe from device
- `request_qr` - Request QR code display

### Chat Namespace (`/chat`)

**Emitted by server:**
- `new_message` - Incoming message received
- `message_status` - Message status update
- `typing_indicator` - Contact is typing

**Expected from client:**
- `subscribe_company` - Subscribe to company chat updates
- `subscribe_chat` - Subscribe to specific chat
- `typing` - Send typing indicator

## Database Indexes

Critical indexes created for performance:

```javascript
Company: { email: 1 }, { subscriptionPlan: 1 }
Device: { companyId: 1, status: 1 }, { phoneNumber: 1 }
Message: { companyId: 1, createdAt: -1 }, { deviceId: 1, status: 1 }
Chat: { companyId: 1, updatedAt: -1 }
ChatMessage: { chatId: 1, createdAt: -1 }
AutoReplyRule: { companyId: 1, deviceId: 1, isActive: 1 }
MessageQueue: { companyId: 1, status: 1 }
```

## Production Deployment

### PM2 Setup

```bash
npm install -g pm2

# Start with PM2
npm run pm2:start

# View logs
npm run pm2:logs

# Restart
npm run pm2:restart

# Stop
npm run pm2:stop
```

### Environment Variables for Production

```env
NODE_ENV=production
PORT=5000

MONGODB_URI=mongodb://prod-db:27017/whatsapp_saas
MONGODB_POOL_SIZE=20

REDIS_URL=redis://prod-cache:6379

JWT_SECRET=<strong_secret_key>
JWT_EXPIRY=7d

MAX_RECONNECT_ATTEMPTS=5
RECONNECT_BACKOFF_INITIAL=1000
RECONNECT_BACKOFF_MAX=60000

MESSAGES_PER_MINUTE=20
GLOBAL_MESSAGE_DELAY=1000
```

### Docker Setup

A Dockerfile and docker-compose.yml will be provided for containerized deployment.

## Rate Limiting

- **Per Company**: 20 messages/minute (configurable per plan)
- **Global Delay**: 1-2 seconds between messages to prevent WhatsApp rate limiting
- **Monthly Quota**: Based on subscription plan

## Error Handling

The application includes comprehensive error handling:

- Request validation errors
- Authentication/authorization errors
- Database errors with automatic retry
- WhatsApp client disconnection with exponential backoff reconnection
- Message queue failure handling with dead letter queue
- Graceful degradation on service unavailability

## Monitoring & Logging

### Health Check

```bash
curl http://localhost:5000/health
```

Response:
```json
{
  "status": "OK",
  "timestamp": "2024-02-25T10:30:00.000Z",
  "uptime": 3600,
  "mongodb": "connected",
  "redis": "connected",
  "whatsappClients": {
    "total": 5,
    "connected": 4,
    "disconnected": 1
  },
  "memory": {
    "heapUsed": 256,
    "heapTotal": 512,
    "external": 10,
    "rss": 600
  }
}
```

### Logs

- **Error logs**: `logs/error.log`
- **Combined logs**: `logs/combined.log`
- **PM2 logs**: `pm2 logs`

## Testing

(Testing setup to be added)

```bash
npm run test
```

## Development

### Code Quality

```bash
npm run lint
```

### Database Seeding

```bash
npm run seed
```

## Architecture Highlights

### Multi-Tenancy

- Shared database with companyId-based data isolation
- Company-specific Redis queues for message processing
- Individual WhatsApp sessions per device
- JWT-based authentication scoped to companies

### Scalability

- Stateless API servers (can run multiple instances)
- Single message worker process (prevents duplicate processing)
- Redis-backed Bull queues for distributed job processing
- MongoDB connection pooling (10 connections)

### Reliability

- Automatic reconnection with exponential backoff for WhatsApp clients
- Message retry logic (3 attempts) with exponential backoff
- Graceful shutdown with proper resource cleanup
- Dead letter queue for permanently failed messages

## Contributing

(Contributing guidelines to be added)

## License

MIT

## Support

For issues, feature requests, or questions, please open an issue on GitHub.

## Roadmap

- [ ] API documentation (Swagger/OpenAPI)
- [ ] Advanced analytics dashboard
- [ ] Webhook integration
- [ ] Custom message templates
- [ ] Contact management system
- [ ] Campaign scheduling
- [ ] Message encryption
- [ ] Multi-language support
- [ ] Mobile app
- [ ] Compliance certifications (SOC2, GDPR)
#   w h a t s r o b o  
 