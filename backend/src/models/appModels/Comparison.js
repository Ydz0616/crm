const mongoose = require('mongoose');

const comparisonSchema = new mongoose.Schema({
  removed: {
    type: Boolean,
    default: false,
  },
  createdBy: { type: mongoose.Schema.ObjectId, ref: 'Admin', required: true },

  number: {
    type: String,
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  expiredDate: {
    type: Date,
    required: true,
  },
  client: {
    type: mongoose.Schema.ObjectId,
    ref: 'Client',
    required: true,
    autopopulate: true,
  },
  exchangeRate: {
    type: Number,
    required: true,
  },
  items: [
    {
      itemName: {
        type: String,
        required: true,
      },
      description: {
        type: String,
      },
      quantity: {
        type: Number,
        required: true,
      },
      price: {
        type: Number,
        required: true,
      },
      purchasePrice: {
        type: Number,
      },
      grossProfit: {
        type: Number,
      },
      total: {
        type: Number,
        required: true,
      }
    }
  ],
  taxRate: {
    type: Number,
    default: 0,
  },
  subTotal: {
    type: Number,
    default: 0,
  },
  taxTotal: {
    type: Number,
    default: 0,
  },
  total: {
    type: Number,
    default: 0,
  },
  currency: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'sent', 'approved', 'rejected'],
    default: 'draft',
  },
  files: [
    {
      type: String,
    },
  ],
  updated: {
    type: Date,
    default: Date.now,
  },
  created: {
    type: Date,
    default: Date.now,
  },
});

comparisonSchema.plugin(require('mongoose-autopopulate'));

module.exports = mongoose.model('Comparison', comparisonSchema); 