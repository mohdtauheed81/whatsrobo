const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const Invoice = require('../../models/Invoice');
const logger = require('../../config/logger');

class InvoiceGenerator {
  /**
   * Generate PDF invoice
   */
  static async generateInvoicePDF(invoiceId, companyId) {
    try {
      // Fetch invoice data
      const invoice = await Invoice.findOne({ _id: invoiceId, companyId })
        .populate('companyId', 'companyName email phoneNumber address country')
        .populate('subscriptionPlan', 'name price');

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // Create PDF document
      const doc = new PDFDocument();

      // Ensure output directory exists
      const outputDir = path.join(process.cwd(), 'invoices');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const fileName = `invoice_${invoice.invoiceNumber}.pdf`;
      const filePath = path.join(outputDir, fileName);

      // Pipe to file
      doc.pipe(fs.createWriteStream(filePath));

      // Header
      doc.fontSize(24)
        .font('Helvetica-Bold')
        .text('INVOICE', { align: 'center' })
        .moveDown();

      doc.fontSize(12)
        .font('Helvetica')
        .text(`Invoice Number: ${invoice.invoiceNumber}`)
        .text(`Date: ${invoice.issuedAt.toLocaleDateString()}`)
        .text(`Due Date: ${invoice.dueDate ? invoice.dueDate.toLocaleDateString() : 'Upon Receipt'}`)
        .moveDown();

      // Company and billing info
      doc.fontSize(11)
        .font('Helvetica-Bold')
        .text('BILL TO:', { underline: true })
        .font('Helvetica')
        .text(invoice.companyId.companyName)
        .text(invoice.companyId.email)
        .text(invoice.companyId.phoneNumber || '')
        .text(invoice.companyId.address || '')
        .text(`${invoice.companyId.country || ''}`)
        .moveDown();

      // Invoice details table
      const tableTop = doc.y;
      const col1 = 50;
      const col2 = 250;
      const col3 = 350;
      const col4 = 450;
      const rowHeight = 25;

      // Table header
      doc.fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#4472C4')
        .rect(col1 - 10, tableTop, 460, rowHeight)
        .fill();

      doc.fillColor('#FFFFFF')
        .text('Description', col1, tableTop + 5)
        .text('Quantity', col2, tableTop + 5)
        .text('Unit Price', col3, tableTop + 5)
        .text('Total', col4, tableTop + 5);

      // Reset color for content
      doc.fillColor('#000000');

      let y = tableTop + rowHeight;

      // Add itemization rows
      if (invoice.itemization && invoice.itemization.length > 0) {
        for (const item of invoice.itemization) {
          doc.fontSize(10)
            .font('Helvetica')
            .text(item.description, col1, y)
            .text(item.quantity.toString(), col2, y, { align: 'right' })
            .text(`$${item.unitPrice.toFixed(2)}`, col3, y, { align: 'right' })
            .text(`$${item.totalPrice.toFixed(2)}`, col4, y, { align: 'right' });
          y += rowHeight;
        }
      } else {
        // Default itemization
        doc.fontSize(10)
          .font('Helvetica')
          .text(invoice.subscriptionPlan.name, col1, y)
          .text('1', col2, y, { align: 'right' })
          .text(`$${invoice.amount.basePrice.toFixed(2)}`, col3, y, { align: 'right' })
          .text(`$${invoice.amount.basePrice.toFixed(2)}`, col4, y, { align: 'right' });
        y += rowHeight;
      }

      y += 10;

      // Totals
      const totalsX = 350;
      doc.fontSize(10)
        .font('Helvetica')
        .text('Subtotal:', totalsX, y)
        .text(`$${invoice.amount.basePrice.toFixed(2)}`, col4, y, { align: 'right' });

      y += rowHeight;

      if (invoice.amount.discountAmount > 0) {
        doc.text('Discount:', totalsX, y)
          .text(`-$${invoice.amount.discountAmount.toFixed(2)}`, col4, y, { align: 'right' });
        y += rowHeight;
      }

      doc.text(`Tax (${(invoice.amount.taxRate * 100).toFixed(1)}%):`, totalsX, y)
        .text(`$${invoice.amount.taxAmount.toFixed(2)}`, col4, y, { align: 'right' });

      y += rowHeight;

      doc.font('Helvetica-Bold')
        .fontSize(12)
        .text('Total:', totalsX, y)
        .text(`$${invoice.amount.totalAmount.toFixed(2)}`, col4, y, { align: 'right' });

      y += 30;

      // Payment details
      doc.fontSize(10)
        .font('Helvetica-Bold')
        .text('Payment Method:', { underline: true })
        .font('Helvetica')
        .text(invoice.paymentMethod || 'Not specified');

      y = doc.y + 20;

      // Footer
      doc.fontSize(9)
        .text('Thank you for your business!', { align: 'center' })
        .text(`Status: ${invoice.status.toUpperCase()}`, { align: 'center' })
        .moveDown()
        .fontSize(8)
        .text('© WhatsApp SaaS Platform', { align: 'center' });

      // Finalize
      doc.end();

      // Wait for file to be written
      await new Promise((resolve, reject) => {
        doc.on('end', resolve);
        doc.on('error', reject);
      });

      // Update invoice with PDF URL
      invoice.pdfUrl = `/invoices/${fileName}`;
      await invoice.save();

      logger.info('Invoice PDF generated', {
        invoiceId: invoiceId.toString(),
        fileName,
        filePath
      });

      return {
        success: true,
        fileName,
        filePath,
        pdfUrl: `/invoices/${fileName}`
      };
    } catch (error) {
      logger.error('Failed to generate invoice PDF', {
        invoiceId: invoiceId.toString(),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Create invoice for subscription
   */
  static async createInvoiceForSubscription(companyId, subscriptionData) {
    try {
      const { planId, billingPeriodStart, billingPeriodEnd, amount } = subscriptionData;

      const invoice = new Invoice({
        companyId,
        subscriptionPlan: planId,
        billingPeriodStart,
        billingPeriodEnd,
        amount: {
          basePrice: amount,
          taxAmount: Math.round(amount * 0.18 * 100) / 100,
          totalAmount: Math.round(amount * 1.18 * 100) / 100
        },
        status: 'issued',
        dueDate: new Date(billingPeriodEnd.getTime() + 30 * 24 * 60 * 60 * 1000)
      });

      await invoice.save();

      logger.info('Invoice created', {
        invoiceId: invoice._id.toString(),
        companyId: companyId.toString(),
        amount: invoice.amount.totalAmount
      });

      return invoice;
    } catch (error) {
      logger.error('Failed to create invoice', {
        companyId: companyId.toString(),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get invoice
   */
  static async getInvoice(invoiceId, companyId) {
    try {
      const invoice = await Invoice.findOne({ _id: invoiceId, companyId })
        .populate('companyId', 'companyName email phoneNumber')
        .populate('subscriptionPlan', 'name price');

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      return invoice;
    } catch (error) {
      logger.error('Failed to get invoice', {
        invoiceId: invoiceId.toString(),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get all invoices for a company
   */
  static async getCompanyInvoices(companyId, options = {}) {
    try {
      const { page = 1, limit = 20, status: filterStatus } = options;
      const skip = (page - 1) * limit;

      const query = { companyId };
      if (filterStatus) {
        query.status = filterStatus;
      }

      const [invoices, total] = await Promise.all([
        Invoice.find(query)
          .populate('subscriptionPlan', 'name')
          .sort({ issuedAt: -1 })
          .skip(skip)
          .limit(limit),
        Invoice.countDocuments(query)
      ]);

      return {
        invoices,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Failed to get company invoices', {
        companyId: companyId.toString(),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Mark invoice as paid
   */
  static async markInvoiceAsPaid(invoiceId, companyId, paymentMethod) {
    try {
      const invoice = await Invoice.findOneAndUpdate(
        { _id: invoiceId, companyId },
        {
          status: 'paid',
          paymentDate: new Date(),
          paymentMethod
        },
        { new: true }
      );

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      logger.info('Invoice marked as paid', { invoiceId: invoiceId.toString() });
      return invoice;
    } catch (error) {
      logger.error('Failed to mark invoice as paid', {
        invoiceId: invoiceId.toString(),
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = InvoiceGenerator;
