require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });
const { generate: uniqueId } = require('shortid');
const mongoose = require('mongoose');

mongoose.connect(process.env.DATABASE);

async function addAdmin() {
  try {
    const Admin = require('../models/coreModels/Admin');
    const AdminPassword = require('../models/coreModels/AdminPassword');

    const existing = await Admin.findOne({ email: 'admin@admin.com', removed: { $ne: true } });
    if (existing) {
      console.log('⚠️ admin@admin.com 已存在，无需重复添加。');
      process.exit(0);
      return;
    }

    const newAdminPassword = new AdminPassword();
    const salt = uniqueId();
    const passwordHash = newAdminPassword.generateHash(salt, 'admin123');

    const defaultAdmin = {
      email: 'admin@admin.com',
      name: 'Admin',
      surname: 'Default',
      enabled: true,
      role: 'owner',
    };
    const result = await new Admin(defaultAdmin).save();

    await new AdminPassword({
      password: passwordHash,
      emailVerified: true,
      salt,
      user: result._id,
    }).save();

    console.log('👍 已添加账号: admin@admin.com / admin123');
    process.exit(0);
  } catch (e) {
    console.error('添加失败:', e);
    process.exit(1);
  }
}

addAdmin();
