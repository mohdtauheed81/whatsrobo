const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'WhatsApp SaaS API',
      version: '1.0.0',
      description: 'Multi-tenant WhatsApp messaging platform API. Supports device management, bulk messaging, chat inbox, auto-reply rules, subscriptions, and invoicing.',
      contact: { name: 'Support', email: 'support@whatsapp-saas.com' }
    },
    servers: [
      { url: 'http://localhost:5000', description: 'Development' },
      { url: 'https://api.your-domain.com', description: 'Production' }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from /api/auth/login'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Error message' }
          }
        },
        Company: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '64b7f3e2c9e77c001234abcd' },
            companyName: { type: 'string', example: 'Acme Corp' },
            email: { type: 'string', format: 'email', example: 'admin@acme.com' },
            isSubscriptionActive: { type: 'boolean', example: true },
            subscriptionEndDate: { type: 'string', format: 'date-time' }
          }
        },
        Device: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string', example: 'Main WhatsApp' },
            phoneNumber: { type: 'string', example: '+1234567890' },
            status: {
              type: 'string',
              enum: ['disconnected', 'connecting', 'qr_pending', 'connected', 'auth_failure'],
              example: 'connected'
            },
            companyId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Message: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            recipientNumber: { type: 'string', example: '+1234567890' },
            message: { type: 'string', example: 'Hello World' },
            status: { type: 'string', enum: ['pending', 'sent', 'delivered', 'read', 'failed'] },
            deviceId: { type: 'string' },
            companyId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        SubscriptionPlan: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string', example: 'Professional' },
            price: { type: 'number', example: 99 },
            maxDevices: { type: 'integer', example: 3 },
            maxMessagesPerMonth: { type: 'integer', example: 50000 },
            isActive: { type: 'boolean', example: true }
          }
        },
        Invoice: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            invoiceNumber: { type: 'string', example: 'INV-202602-0001' },
            amount: { type: 'number', example: 99 },
            status: { type: 'string', enum: ['draft', 'issued', 'paid', 'cancelled'] },
            createdAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    security: [{ BearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication and account management' },
      { name: 'Devices', description: 'WhatsApp device management' },
      { name: 'Messages', description: 'Single and bulk messaging' },
      { name: 'Chats', description: 'Chat inbox management' },
      { name: 'Auto-Reply', description: 'Automated reply rules' },
      { name: 'Subscriptions', description: 'Plan management and billing' },
      { name: 'Invoices', description: 'Invoice retrieval and PDF download' },
      { name: 'Admin', description: 'Platform administration (admin only)' },
      { name: 'GDPR', description: 'Data privacy and compliance' },
      { name: 'Health', description: 'Server health monitoring' }
    ]
  },
  apis: ['./src/routes/*.js', './src/server.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
