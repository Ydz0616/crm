const mongoose = require('mongoose');

const Model = mongoose.model('PurchaseOrder');
const Invoice = mongoose.model('Invoice');

const custom = require('@/controllers/pdfController');
const { increaseBySettingKey } = require('@/middlewares/settings');
const { calculate } = require('@/helpers');

const create = async (req, res) => {
  const { items = [], discount = 0, relatedInvoice } = req.body;

  // default
  let total = 0;

  //Calculate the items array with total
  items.map((item) => {
    let itemTotal = calculate.multiply(item['quantity'], item['price']);
    //add to total
    total = calculate.add(total, itemTotal);
    //item total
    item['total'] = itemTotal;
  });

  // Apply discount if provided
  if (discount > 0) {
    total = calculate.subtract(total, discount);
  }

  let body = req.body;

  body['total'] = total;
  body['items'] = items;
  body['createdBy'] = req.admin._id;

  // Creating a new document in the collection
  const result = await new Model(body).save();
  const fileId = 'po-' + result._id + '.pdf';
  const updateResult = await Model.findOneAndUpdate(
    { _id: result._id },
    { pdf: fileId },
    {
      new: true,
    }
  ).exec();

  // If there's a related invoice, update it with this purchase order
  if (relatedInvoice) {
    await Invoice.findByIdAndUpdate(
      relatedInvoice,
      { $push: { relatedPurchaseOrders: result._id } },
      { new: true }
    );
  }
  
  increaseBySettingKey({
    settingKey: 'last_purchase_order_number',
  });

  // Returning successfull response
  return res.status(200).json({
    success: true,
    result: updateResult,
    message: 'Purchase Order created successfully',
  });
};
module.exports = create;
