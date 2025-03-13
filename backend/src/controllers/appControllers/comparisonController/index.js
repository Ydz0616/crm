const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');
const methods = createCRUDController('Comparison');

const getPurchasePrice = require('./getPurchasePrice');
const create = require('./create');
const summary = require('./summary');
const update = require('./update');
const paginatedList = require('./paginatedList');

methods.getPurchasePrice = getPurchasePrice;
methods.create = create;
methods.update = update;
methods.summary = summary;
methods.list = paginatedList;

module.exports = methods; 