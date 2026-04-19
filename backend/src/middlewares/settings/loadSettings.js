const listAllSettings = require('./listAllSettings');

const loadSettings = async (createdBy = null) => {
  const allSettings = {};
  const datas = await listAllSettings(createdBy);
  datas.forEach(({ settingKey, settingValue }) => {
    allSettings[settingKey] = settingValue;
  });
  return allSettings;
};

module.exports = loadSettings;
