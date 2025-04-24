const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  removed: {
    type: Boolean,
    default: false,
  },
  createdBy: { type: mongoose.Schema.ObjectId, ref: 'Admin', required: true },

  converted: {
    type: Boolean,
    default: false,
  },
  number: {
    type: String,
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  content: String,
  date: {
    type: Date,
    required: true,
  },
  expiredDate: {
    type: Date,
    required: true,
  },

  // client: {
  //   type: mongoose.Schema.ObjectId,
  //   ref: 'Client',
  //   required: true,
  //   autopopulate: true,
  // },
  factory: {
    type: mongoose.Schema.ObjectId,
    ref: 'Factory',
    required: true,
    autopopulate: true,
  },
  relatedInvoice: {
    type: mongoose.Schema.ObjectId,
    ref: 'Invoice',
    autopopulate: true
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
      laser: {
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
      total: {
        type: Number,
        required: true,
      },
      unit_en: {
        type: String,
      },
      unit_cn: {
        type: String,
      },
    },
  ],
  total: {
    type: Number,
    required: true,
  },
  credit: {
    type: Number,
    default: 0,
  },
  currency: {
    type: String,
    default: 'USD',
    uppercase: true,
    required: true,
  },
  discount: {
    type: Number,
    default: 0,
  },
  notes: {
    type: [String],
    default: [],
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'sent', 'accepted', 'declined', 'cancelled', 'on hold'],
    default: 'draft',
  },
  approved: {
    type: Boolean,
    default: false,
  },
  isExpired: {
    type: Boolean,
    default: false,
  },
  pdf: {
    type: String,
  },
  files: [
    {
      id: String,
      name: String,
      path: String,
      description: String,
      isPublic: {
        type: Boolean,
        default: true,
      },
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

orderSchema.plugin(require('mongoose-autopopulate'));
module.exports = mongoose.model('PurchaseOrder', orderSchema);



