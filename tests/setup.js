// Load environment variables for tests
require('dotenv').config({ path: '.env.test' });

// Fallback test environment values
process.env.NODE_ENV = 'test';
process.env.PORT = process.env.PORT || '5001';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_for_testing_only';
process.env.JWT_EXPIRY = '1h';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp_saas_test';
process.env.LOG_LEVEL = 'error'; // Silence logs during tests
