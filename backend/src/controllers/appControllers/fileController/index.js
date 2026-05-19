const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');
const methods = createCRUDController('File');

const upload = require('./upload');

methods.create = upload;

module.exports = methods;
