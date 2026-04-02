const Joi = require('joi');
const mongoose = require('mongoose');

const onboarding = async (req, res) => {
  const Admin = mongoose.model('Admin');
  const Setting = mongoose.model('Setting');

  // 1. 获取当前用户
  const adminId = req.admin._id;
  const admin = await Admin.findById(adminId);

  if (!admin) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'User not found.',
    });
  }

  if (admin.onboarded) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'User has already completed onboarding.',
    });
  }

  // 2. Joi 校验
  const schema = Joi.object({
    // Step 1: About You
    phone: Joi.string().allow('').max(30).optional(),
    jobTitle: Joi.string().allow('').max(100).optional(),

    // Step 2: Your Company
    companyName: Joi.string().min(1).max(200).required(),
    companyCountry: Joi.string().min(1).max(100).required(),
    companyAddress: Joi.string().allow('').max(500).optional(),
    companyPhone: Joi.string().allow('').max(30).optional(),
    companyEmail: Joi.string().allow('').email({ tlds: { allow: true } }).optional(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      result: null,
      message: error.details[0]?.message || 'Invalid input.',
    });
  }

  // 3. 更新 Admin 个人信息
  admin.phone = value.phone || '';
  admin.jobTitle = value.jobTitle || '';
  admin.onboarded = true;
  await admin.save();

  // 4. 批量更新 Settings（公司信息）
  const settingsToUpdate = [
    { key: 'company_name', value: value.companyName },
    { key: 'company_country', value: value.companyCountry },
    { key: 'company_address', value: value.companyAddress || '' },
    { key: 'company_phone', value: value.companyPhone || '' },
    { key: 'company_email', value: value.companyEmail || '' },
  ];

  const bulkOps = settingsToUpdate.map(({ key, value: val }) => ({
    updateOne: {
      filter: { settingKey: key, createdBy: adminId },
      update: { $set: { settingValue: val } },
    },
  }));

  const bulkResult = await Setting.bulkWrite(bulkOps);
  if (bulkResult.modifiedCount < settingsToUpdate.length) {
    const missing = settingsToUpdate.length - bulkResult.modifiedCount;
    console.warn(`⚠️ Onboarding: ${missing}/${settingsToUpdate.length} settings were not updated (possible missing keys for user ${adminId})`);
  }

  // 5. 返回更新后的用户信息
  console.log(`🚀 用户上车完成: ${admin.email} — 公司: ${value.companyName}`);

  return res.status(200).json({
    success: true,
    result: {
      _id: admin._id,
      name: admin.name,
      surname: admin.surname,
      role: admin.role,
      email: admin.email,
      photo: admin.photo,
      phone: admin.phone,
      jobTitle: admin.jobTitle,
      onboarded: admin.onboarded,
    },
    message: 'Onboarding completed successfully.',
  });
};

module.exports = onboarding;
