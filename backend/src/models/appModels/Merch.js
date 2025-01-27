const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  removed: {
    type: Boolean,
    default: false
  },

  serialNumber: {
    type: String,
    required: true,
    key: true
  },
  serialNumberLong: {
    type: String, 
    required: true
  },
  serialNumberEasyWeld: {
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
    type: Number,
    required: true
  },
  note: {
    type: String
  },
  note_2: {
    type: String
  }
});

schema.plugin(require('mongoose-autopopulate'));

module.exports = mongoose.model('Merch', schema);

