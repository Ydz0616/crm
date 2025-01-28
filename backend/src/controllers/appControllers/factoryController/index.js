const mongoose = require('mongoose');
const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');

function modelController() {
  const Model = mongoose.model('Factory');
  const methods = createCRUDController('Factory');
  return methods;
}

module.exports = modelController();
