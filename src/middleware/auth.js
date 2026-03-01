const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

const authenticate = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.companyId = decoded.companyId;
    req.email = decoded.email;
    req.isAdmin = decoded.role === 'admin';
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      logger.warn('Token expired', { error: error.message });
      return res.status(401).json({ error: 'Token expired' });
    }
    logger.warn('Authentication failed', { error: error.message });
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Optional auth middleware (doesn't fail if no token)
const optionalAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.companyId = decoded.companyId;
      req.email = decoded.email;
    }
    next();
  } catch (error) {
    next();
  }
};

// Socket.IO auth middleware
const socketAuthMiddleware = (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    socket.companyId = decoded.companyId;
    socket.email = decoded.email;
    next();
  } catch (error) {
    logger.warn('Socket authentication failed', { error: error.message });
    next(new Error('Invalid token'));
  }
};

module.exports = {
  authenticate,
  optionalAuth,
  socketAuthMiddleware
};
