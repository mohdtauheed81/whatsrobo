const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../middleware/auth');
const logger = require('../config/logger');

// Get all invoices for company
router.get('/', authenticate, async (req, res) => {
  try {
    const Invoice = require('../models/Invoice');
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const invoices = await Invoice.find({ companyId: req.companyId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('subscriptionPlan', 'name price');

    const total = await Invoice.countDocuments({ companyId: req.companyId });

    res.json({
      success: true,
      invoices,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    logger.error('Get invoices error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// Get single invoice
router.get('/:invoiceId', authenticate, async (req, res) => {
  try {
    const Invoice = require('../models/Invoice');
    const invoice = await Invoice.findOne({ _id: req.params.invoiceId, companyId: req.companyId })
      .populate('subscriptionPlan', 'name price features');

    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    res.json({ success: true, invoice });
  } catch (error) {
    logger.error('Get invoice error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

// Download invoice PDF
router.get('/:invoiceId/download', authenticate, async (req, res) => {
  try {
    const Invoice = require('../models/Invoice');
    const invoice = await Invoice.findOne({ _id: req.params.invoiceId, companyId: req.companyId })
      .populate('subscriptionPlan');

    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    // Generate PDF if not exists
    const InvoiceGenerator = require('../services/subscription/InvoiceGenerator');
    const pdfPath = await InvoiceGenerator.generatePDF(invoice);

    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({ error: 'PDF not found' });
    }

    res.download(pdfPath, 'invoice_' + invoice.invoiceNumber + '.pdf', (err) => {
      if (err) logger.error('Invoice download error', { error: err.message });
    });
  } catch (error) {
    logger.error('Download invoice error', { error: error.message });
    res.status(500).json({ error: 'Failed to download invoice' });
  }
});

module.exports = router;
