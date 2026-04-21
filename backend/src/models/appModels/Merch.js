const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  removed: {
    type: Boolean,
    default: false
  },
  createdBy: { type: mongoose.Schema.ObjectId, ref: 'Admin' },

  serialNumber: {
    type: String,
    required: true,
    key: true
  },
  serialNumberLong: {
    type: String
  },
  description_en: {
    type: String,
    required: true
  },
  description_cn: {
    type: String
  },
  weight: {
    type: Number
  },
  VAT: {
    type: Number
  },
  ETR: {
    type: Number
  },
  unit_en: {
    type: String,
    required: true
  },
  unit_cn: {
    type: String
  }
});

schema.plugin(require('mongoose-autopopulate'));

module.exports = mongoose.model('Merch', schema);

