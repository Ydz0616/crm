const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const adminSchema = new Schema({
  removed: {
    type: Boolean,
    default: false,
  },
  enabled: {
    type: Boolean,
    default: true, // MVP: 注册即启用
  },

  email: {
    type: String,
    lowercase: true,
    trim: true,
    required: true,
  },
  name: { type: String, required: true },
  surname: { type: String },
  photo: {
    type: String,
    trim: true,
  },

  role: {
    type: String,
    default: 'user',
    enum: ['owner', 'admin', 'user'],
  },

  // 公司信息（上车时收集）
  company: {
    name: { type: String },
    country: { type: String },
    phone: { type: String },
    industry: { type: String },
  },

  // 上车状态
  onboarded: { type: Boolean, default: false },

  created: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Admin', adminSchema);
