const mongoose = require('mongoose');
const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');

function modelController() {
  const Model = mongoose.model('Merch');
  const methods = createCRUDController('Merch');
  return methods;
}

module.exports = modelController();


