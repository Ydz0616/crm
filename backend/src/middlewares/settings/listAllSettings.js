const mongoose = require('mongoose');

const Model = mongoose.model('Setting');

const listAllSettings = async (createdBy = null) => {
  const filter = { removed: { $ne: true } };
  if (createdBy) filter.createdBy = createdBy;
  const result = await Model.find(filter).exec();
  return result;
};

module.exports = listAllSettings;
