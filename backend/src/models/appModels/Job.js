const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  removed: {
    type: Boolean,
    default: false,
  },
  enabled: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'Admin',
    required: true,
  },
  created: {
    type: Date,
    default: Date.now,
  },
  updated: {
    type: Date,
    default: Date.now,
  },
  type: {
    type: String,
    required: true,
    enum: ['transcription'],
  },
  refModel: {
    type: String,
    required: true,
    enum: ['File'],
  },
  refId: {
    type: mongoose.Schema.ObjectId,
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'running', 'done', 'failed'],
    default: 'pending',
  },
  result: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  error: {
    type: String,
    default: '',
  },
  attempts: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.model('Job', jobSchema);
