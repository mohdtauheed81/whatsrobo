const winston = require('winston');
const path = require('path');
require('dotenv').config();

const logDir = process.env.LOG_DIR || './logs';
const logLevel = process.env.LOG_LEVEL || 'info';

// Define custom log format
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, ...metadata }) => {
    let meta = '';
    if (Object.keys(metadata).length > 0) {
      meta = JSON.stringify(metadata);
    }
    return `${timestamp} [${level.toUpperCase()}]: ${message} ${meta}`;
  })
);

const logger = winston.createLogger({
  level: logLevel,
  format: customFormat,
  defaultMeta: { service: 'whatsapp-saas' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        customFormat
      )
    }),
    // Error log file
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5
    }),
    // Combined log file
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 10485760,
      maxFiles: 5
    })
  ]
});

module.exports = logger;
