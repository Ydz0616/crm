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
  phone: { type: String },     // 个人电话（上车时收集）
  jobTitle: { type: String },  // 职位（上车时收集）

  role: {
    type: String,
    default: 'user',
    enum: ['owner', 'admin', 'user'],
  },

  // 上车状态（注册时 false，完成上车表单后 true）
  onboarded: { type: Boolean, default: false },

  // Per-salesperson Ask Ola language preference. Drives the SESSION_LANG
  // directive prepended to NanoBot user content (see olaController/chat.js).
  // Existing docs without this field read undefined; consumers fall back to
  // 'zh' via `|| 'zh'`. No migration needed.
  language: { type: String, enum: ['zh', 'en'], default: 'zh' },

  created: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Admin', adminSchema);
