const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');
const methods = createCRUDController('PurchaseOrder');


const create = require('./create');
const summary = require('./summary');
const update = require('./update');
const paginatedList = require('./paginatedList');
const read = require('./read');
const copy = require('./copy');

methods.list = paginatedList;
methods.read = read;


methods.create = create;
methods.update = update;
methods.summary = summary;
methods.copy = copy;

module.exports = methods;


