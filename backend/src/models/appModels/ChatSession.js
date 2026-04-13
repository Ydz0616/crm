const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  removed: {
    type: Boolean,
    default: false,
  },
  enabled: {
    type: Boolean,
    default: true,
  },

  userId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Admin',
    required: true,
    index: true,
  },
  title: {
    type: String,
    default: 'New Chat',
  },
  nanobotSessionId: {
    type: String,
    required: true,
    unique: true,
  },
  createdBy: { type: mongoose.Schema.ObjectId, ref: 'Admin' },
  created: {
    type: Date,
    default: Date.now,
  },
  updated: {
    type: Date,
    default: Date.now,
  },
});

schema.plugin(require('mongoose-autopopulate'));

module.exports = mongoose.model('ChatSession', schema);
