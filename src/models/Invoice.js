const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true
    },
    invoiceNumber: {
      type: String,
      unique: true,
      required: true
    },
    subscriptionPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      required: true
    },
    billingPeriodStart: {
      type: Date,
      required: true
    },
    billingPeriodEnd: {
      type: Date,
      required: true
    },
    amount: {
      currency: {
        type: String,
        default: 'USD'
      },
      basePrice: {
        type: Number,
        required: true,
        min: 0
      },
      taxRate: {
        type: Number,
        default: 0.18,
        min: 0,
        max: 1
      },
      taxAmount: {
        type: Number,
        default: 0,
        min: 0
      },
      discountAmount: {
        type: Number,
        default: 0,
        min: 0
      },
      totalAmount: {
        type: Number,
        required: true,
        min: 0
      }
    },
    status: {
      type: String,
      enum: ['draft', 'issued', 'sent', 'viewed', 'paid', 'overdue', 'cancelled'],
      default: 'draft'
    },
    paymentMethod: {
      type: String,
      enum: ['credit_card', 'bank_transfer', 'stripe', 'paypal'],
      sparse: true
    },
    paymentDate: Date,
    dueDate: Date,
    notes: String,
    pdfUrl: String,
    itemization: [{
      description: String,
      quantity: Number,
      unitPrice: Number,
      totalPrice: Number
    }],
    issuedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Indexes
invoiceSchema.index({ companyId: 1, createdAt: -1 });
invoiceSchema.index({ invoiceNumber: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ billingPeriodStart: 1, billingPeriodEnd: 1 });

// Generate invoice number if not provided
invoiceSchema.pre('save', async function(next) {
  if (!this.invoiceNumber) {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const count = await mongoose.model('Invoice').countDocuments({
      createdAt: {
        $gte: new Date(year, new Date().getMonth(), 1),
        $lt: new Date(year, new Date().getMonth() + 1, 1)
      }
    });
    this.invoiceNumber = `INV-${year}${month}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Invoice', invoiceSchema);
