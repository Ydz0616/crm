const mongoose = require('mongoose');
const searchPriceHistory = require('./searchPriceHistory');

function modelController() {
  const methods = {};
  
  // 添加搜索价格历史的方法
  methods.searchPriceHistory = searchPriceHistory;
  
  return methods;
}

module.exports = modelController(); 