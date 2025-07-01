const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');
const methods = createCRUDController('Comparison');

const getPurchasePrice = require('./getPurchasePrice');
const create = require('./create');
const summary = require('./summary');
const update = require('./update');
const paginatedList = require('./paginatedList');
const fullComparison = require('./fullComparison');

methods.getPurchasePrice = getPurchasePrice;
methods.create = create;
methods.update = update;
methods.summary = summary;
methods.list = paginatedList;
methods.fullComparison = fullComparison;

module.exports = methods; 