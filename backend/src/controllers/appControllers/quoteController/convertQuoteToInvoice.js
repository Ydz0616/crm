const mongoose = require('mongoose');
const Quote = require('@/models/appModels/Quote');
const Invoice = require('@/models/appModels/Invoice');

const convertQuoteToInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find quote and populate client
    const quote = await Quote.findOne({ _id: id, removed: false }).populate('client');
    
    if (!quote) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Quote not found',
      });
    }

    // Check if quote is already converted
    if (quote.converted) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Quote already converted to invoice',
      });
    }

    // Ensure items have unit information preserved
    const items = quote.items.map(item => {
      return {
        ...item.toObject(),
        // 确保单位信息被保留
        unit_cn: item.unit_cn,
        unit_en: item.unit_en
      };
    });

    // Create new invoice from quote data
    const invoice = new Invoice({
      number: quote.number,
      year: quote.year,
      date: quote.date,
      expiredDate: quote.expiredDate,
      client: quote.client._id,
      items: items, // 使用处理过的items数组
      subTotal: quote.subTotal,
      total: quote.total,
      credit: quote.credit,
      currency: quote.currency,
      discount: quote.discount || 0,
      notes: quote.notes,
      freight: quote.freight || 0,
      // Invoice specific fields
      payment: [],
      paymentStatus: 'unpaid',
      isOverdue: false,
      status: 'draft',
      approved: false,
      createdBy: req.admin._id,
      // Add reference to the original quote
      relatedQuotes: [quote._id]
    });

    // Save new invoice
    const result = await invoice.save();

    // Mark quote as converted
    quote.converted = true;
    await quote.save();

    return res.status(200).json({
      success: true,
      result: result,
      message: 'Quote successfully converted to invoice',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: error.message,
      error: error,
    });
  }
};

module.exports = convertQuoteToInvoice;
