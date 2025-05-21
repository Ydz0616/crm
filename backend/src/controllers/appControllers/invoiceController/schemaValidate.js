const Joi = require('joi');
const schema = Joi.object({
  client: Joi.alternatives().try(Joi.string(), Joi.object()).required(),
  number: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
  year: Joi.number().required(),
  status: Joi.string().required(),
  notes: Joi.array().items(Joi.string()).default([]),
  termsOfDelivery: Joi.array().items(Joi.string()).default([]),
  shippingMark: Joi.array().items(Joi.string()).default([]),
  paymentTerms: Joi.array().items(Joi.string()).default([]),
  bankDetails: Joi.string().allow('').default(''),
  packaging: Joi.array().items(Joi.string()).default([]),
  shipmentDocuments: Joi.array().items(Joi.string()).default([]),
  expiredDate: Joi.date().required(),
  date: Joi.date().required(),
  currency: Joi.string().allow(''),
  relatedPurchaseOrders: Joi.array().items(Joi.string()).optional(),
  freight: Joi.number().default(0),
  discount: Joi.number().default(0),
  // array cannot be empty
  items: Joi.array()
    .items(
      Joi.object({
        _id: Joi.string().allow('').optional(),
        itemName: Joi.string().required(),
        description: Joi.string().allow(''),
        laser: Joi.string().allow(''),
        quantity: Joi.number().required(),
        price: Joi.number().required(),
        total: Joi.number().required(),
        unit_en: Joi.string().allow(''),
        unit_cn: Joi.string().allow(''),
      }).required()
    )
    .required(),
  taxRate: Joi.alternatives().try(Joi.number(), Joi.string()).default(0),
});

module.exports = schema;
