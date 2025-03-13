const mongoose = require('mongoose');

const Model = mongoose.model('PurchaseOrder');
const Invoice = mongoose.model('Invoice');

const custom = require('@/controllers/pdfController');
const { increaseBySettingKey } = require('@/middlewares/settings');
const { calculate } = require('@/helpers');

const create = async (req, res) => {
  const { items = [], taxRate = 0, discount = 0, relatedInvoice } = req.body;

  // default
  let subTotal = 0;
  let taxTotal = 0;
  let total = 0;
  // let credit = 0;

  //Calculate the items array with subTotal, total, taxTotal
  items.map((item) => {
    let total = calculate.multiply(item['quantity'], item['price']);
    //sub total
    subTotal = calculate.add(subTotal, total);
    //item total
    item['total'] = total;
  });
  taxTotal = calculate.multiply(subTotal, taxRate / 100);
  total = calculate.add(subTotal, taxTotal);

  let body = req.body;

  body['subTotal'] = subTotal;
  body['taxTotal'] = taxTotal;
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
