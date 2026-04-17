const mongoose = require('mongoose');

const Model = mongoose.model('Setting');

const listAllSettings = async (createdBy = null) => {
  try {
    const filter = { removed: { $ne: true } };
    if (createdBy) filter.createdBy = createdBy;
    const result = await Model.find(filter).exec();

    if (result.length > 0) {
      return result;
    } else {
      return [];
    }
  } catch {
    return [];
  }
};

module.exports = listAllSettings;
