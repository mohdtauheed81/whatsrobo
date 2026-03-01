const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const companySchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: /.+\@.+\..+/
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false
    },
    phoneNumber: String,
    website: String,
    country: String,
    address: String,
    subscriptionPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      required: true
    },
    subscriptionStartDate: {
      type: Date,
      default: Date.now
    },
    subscriptionEndDate: {
      type: Date,
      required: true
    },
    isSubscriptionActive: {
      type: Boolean,
      default: true
    },
    usageStats: {
      messagesThisMonth: {
        type: Number,
        default: 0,
        min: 0
      },
      lastResetDate: {
        type: Date,
        default: Date.now
      },
      totalMessagesAllTime: {
        type: Number,
        default: 0
      }
    },
    paymentMethod: {
      type: String,
      enum: ['credit_card', 'bank_transfer', 'stripe'],
      default: 'credit_card'
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    },
    lastLoginAt: Date,
    apiKey: {
      type: String,
      unique: true,
      sparse: true
    },
    // OAuth
    googleId: { type: String, sparse: true },
    isEmailVerified: { type: Boolean, default: false },
    // Stripe
    stripeCustomerId: { type: String, sparse: true },
    // GDPR compliance
    gdprConsentLog: [
      {
        givenAt: Date,
        ipAddress: String,
        userAgent: String,
        types: [String],
        given: Boolean
      }
    ],
    gdprConsentUpdatedAt: Date,
    gdprDeletedAt: Date
  },
  {
    timestamps: true
  }
);

// Indexes
companySchema.index({ email: 1 });
companySchema.index({ subscriptionPlan: 1 });
companySchema.index({ subscriptionEndDate: 1 });

// Hash password before saving
companySchema.pre('save', async function() {
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare passwords
companySchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to generate API key
companySchema.methods.generateApiKey = function() {
  this.apiKey = require('crypto').randomBytes(32).toString('hex');
  return this.apiKey;
};

// Virtual for subscription days remaining
companySchema.virtual('daysRemaining').get(function() {
  const now = new Date();
  const daysLeft = Math.ceil((this.subscriptionEndDate - now) / (1000 * 60 * 60 * 24));
  return Math.max(0, daysLeft);
});

module.exports = mongoose.model('Company', companySchema);
