const mongoose = require('mongoose');
const Model = mongoose.model('PurchaseOrder');
const Invoice = mongoose.model('Invoice');
const { calculate } = require('@/helpers');
const moment = require('moment');

const update = async (req, res) => {
  try {
    const previousOrder = await Model.findOne({
      _id: req.params.id,
      removed: false,
    });

    if (!previousOrder) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'No purchase order found by this id: ' + req.params.id,
      });
    }

    // Get the current date
    const currentDate = moment();
    
    // Get the expire date from the request or the previous order
    const expireDate = req.body.expiredDate 
      ? moment(req.body.expiredDate) 
      : moment(previousOrder.expiredDate);
    
    // Check if the order is expired
    const isExpired = currentDate.isAfter(expireDate);

    // Add the isExpired flag to the request body
    req.body.isExpired = isExpired;

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
    body['updated'] = new Date();

    // Handle related invoice change
    if (relatedInvoice && (!previousOrder.relatedInvoice || 
        relatedInvoice !== previousOrder.relatedInvoice.toString())) {
      
      // If there was a previous related invoice, remove this PO from it
      if (previousOrder.relatedInvoice) {
        await Invoice.findByIdAndUpdate(
          previousOrder.relatedInvoice,
          { $pull: { relatedPurchaseOrders: req.params.id } }
        );
      }
      
      // Add this PO to the new related invoice
      await Invoice.findByIdAndUpdate(
        relatedInvoice,
        { $push: { relatedPurchaseOrders: req.params.id } },
        { new: true }
      );
    } else if (!relatedInvoice && previousOrder.relatedInvoice) {
      // If related invoice was removed, update the previous invoice
      await Invoice.findByIdAndUpdate(
        previousOrder.relatedInvoice,
        { $pull: { relatedPurchaseOrders: req.params.id } }
      );
    }

    const result = await Model.findOneAndUpdate(
      { _id: req.params.id },
      body,
      {
        new: true,
      }
    ).exec();

    return res.status(200).json({
      success: true,
      result,
      message: 'Purchase order updated successfully',
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Oops there is an Error',
      error: err,
    });
  }
};

module.exports = update;
