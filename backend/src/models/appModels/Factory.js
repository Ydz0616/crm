const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  removed: {
    type: Boolean,
    default: false
  },

  factory_code: {
    type: String,
    required: true,
    key: true
  },
  factory_name: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  contact: {
    type: String,
    required: true
  },
  tel1: {
    type: String,
    required: true
  },
  tel2: {
    type: String
  }
});

schema.plugin(require('mongoose-autopopulate'));

module.exports = mongoose.model('Factory', schema);



