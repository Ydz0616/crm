const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { generate: uniqueId } = require('shortid');
const { globSync } = require('glob');
const fs = require('fs');
const mongoose = require('mongoose');

const register = async (req, res, { userModel }) => {
  const UserModel = mongoose.model(userModel);
  const UserPasswordModel = mongoose.model(userModel + 'Password');

  const { name, email, password } = req.body;

  // 1. Joi 校验
  const objectSchema = Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string()
      .email({ tlds: { allow: true } })
      .required(),
    password: Joi.string().min(6).required(),
  });

  const { error, value } = objectSchema.validate({ name, email, password });
  if (error) {
    return res.status(400).json({
      success: false,
      result: null,
      message: error.details[0]?.message || 'Invalid input.',
    });
  }

  // 2. 检查 email 唯一性
  const existingUser = await UserModel.findOne({ email: value.email, removed: false });
  if (existingUser) {
    return res.status(409).json({
      success: false,
      result: null,
      message: '该邮箱已注册。',
    });
  }

  // 3. 创建 Admin: role='user', enabled=true, onboarded=false
  const newUser = await new UserModel({
    email: value.email,
    name: value.name,
    role: 'user',
    enabled: true,
    onboarded: false,
  }).save();

  // 4. 创建 AdminPassword: generateHash(salt, password)
  const salt = uniqueId();
  const newUserPassword = new UserPasswordModel();
  const passwordHash = newUserPassword.generateHash(salt, value.password);

  await new UserPasswordModel({
    user: newUser._id,
    password: passwordHash,
    salt: salt,
    emailVerified: false,
    authType: 'email',
  }).save();

  // 5. 复制 defaultSettings → 新增 Setting 记录（带 createdBy）
  const Setting = mongoose.model('Setting');
  const settingsFiles = globSync('./src/setup/defaultSettings/**/*.json');
  const settingDocs = [];
  for (const filePath of settingsFiles) {
    const file = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    for (const setting of file) {
      settingDocs.push({ ...setting, createdBy: newUser._id });
    }
  }
  if (settingDocs.length > 0) {
    await Setting.insertMany(settingDocs);
  }

  // 6. 创建默认 PaymentMode + Taxes（带 createdBy）
  const PaymentMode = mongoose.model('PaymentMode');
  const Taxes = mongoose.model('Taxes');

  await Taxes.create({ taxName: 'Tax 0%', taxValue: '0', isDefault: true, createdBy: newUser._id });
  await PaymentMode.create({
    name: 'Default Payment',
    description: 'Default Payment Mode (Cash, Wire Transfer)',
    isDefault: true,
    createdBy: newUser._id,
  });

  // 7. 生成 JWT, set cookie
  const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: '24h' });

  await UserPasswordModel.findOneAndUpdate(
    { user: newUser._id },
    { $push: { loggedSessions: token } },
    { new: true }
  ).exec();

  // 8. 日志
  console.log(`📝 新用户注册: ${value.email} at ${new Date().toISOString()}`);

  // 9. 返回
  res
    .status(200)
    .cookie('token', token, {
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'Lax',
      httpOnly: true,
      secure: false,
      domain: req.hostname,
      path: '/',
      Partitioned: true,
    })
    .json({
      success: true,
      result: {
        _id: newUser._id,
        name: newUser.name,
        role: newUser.role,
        email: newUser.email,
      },
      message: 'Successfully registered.',
    });
};

module.exports = register;
