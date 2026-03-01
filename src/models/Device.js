const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    phoneNumber: String,
    status: {
      type: String,
      enum: ['disconnected', 'connecting', 'qr_pending', 'connected', 'auth_failed'],
      default: 'disconnected'
    },
    sessionPath: {
      type: String,
      unique: true,
      sparse: true
    },
    lastConnected: Date,
    connectionAttempts: {
      type: Number,
      default: 0
    },
    maxConnectionAttempts: {
      type: Number,
      default: 5
    },
    isActive: {
      type: Boolean,
      default: true
    },
    qrCodeUrl: String,
    qrCodeExpiry: Date,
    errorMessage: String,
    clientConfig: {
      headless: {
        type: Boolean,
        default: true
      },
      args: {
        type: [String],
        default: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    }
  },
  {
    timestamps: true
  }
);

// Indexes
deviceSchema.index({ companyId: 1, status: 1 });
deviceSchema.index({ phoneNumber: 1 });
deviceSchema.index({ sessionPath: 1 });

module.exports = mongoose.model('Device', deviceSchema);
