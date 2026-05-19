const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
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
  originalName: {
    type: String,
    required: true,
    trim: true,
  },
  mimeType: {
    type: String,
    required: true,
  },
  sizeBytes: {
    type: Number,
    required: true,
    min: 0,
  },
  sourcePath: {
    type: String,
    required: true,
  },
  transcriptionJobId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Job',
  },
  created: {
    type: Date,
    default: Date.now,
  },
  updated: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('File', fileSchema);
