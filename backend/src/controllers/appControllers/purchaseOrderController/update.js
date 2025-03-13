const mongoose = require('mongoose');

const Model = mongoose.model('PurchaseOrder');
const Invoice = mongoose.model('Invoice');

const custom = require('@/controllers/pdfController');

const { calculate } = require('@/helpers');

const update = async (req, res) => {
  const { items = [], taxRate = 0, discount = 0, relatedInvoice } = req.body;

  if (items.length === 0) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Items cannot be empty',
    });
  }
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
  body['pdf'] = 'po-' + req.params.id + '.pdf';

  if (body.hasOwnProperty('currency')) {
    delete body.currency;
  }
  
  // Get the current purchase order to check for changes in relatedInvoice
  const currentPO = await Model.findOne({ _id: req.params.id, removed: false });
  const oldRelatedInvoice = currentPO?.relatedInvoice;
  
  // Find document by id and updates with the required fields
  const result = await Model.findOneAndUpdate({ _id: req.params.id, removed: false }, body, {
    new: true, // return the new result instead of the old one
  }).exec();

  // Handle invoice relationships
  if (relatedInvoice) {
    // If the related invoice has changed
    if (!oldRelatedInvoice || oldRelatedInvoice.toString() !== relatedInvoice.toString()) {
      // Remove this PO from the old invoice's relatedPurchaseOrders if it exists
      if (oldRelatedInvoice) {
        await Invoice.findByIdAndUpdate(
          oldRelatedInvoice,
          { $pull: { relatedPurchaseOrders: req.params.id } }
        );
      }
      
      // Add this PO to the new invoice's relatedPurchaseOrders
      await Invoice.findByIdAndUpdate(
        relatedInvoice,
        { $addToSet: { relatedPurchaseOrders: req.params.id } },
        { new: true }
      );
    }
  } else if (oldRelatedInvoice) {
    // If the related invoice was removed, update the old invoice
    await Invoice.findByIdAndUpdate(
      oldRelatedInvoice,
      { $pull: { relatedPurchaseOrders: req.params.id } }
    );
  }

  // Returning successfull response
  return res.status(200).json({
    success: true,
    result,
    message: 'we update this document ',
  });
};
module.exports = update;
