const mongoose = require('mongoose');
const Model = mongoose.model('PurchaseOrder');
const Invoice = mongoose.model('Invoice');
const Merch = mongoose.model('Merch');
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

    // 处理每个项目，确保单位信息存在
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      let itemTotal = calculate.multiply(item['quantity'], item['price']);
      
      // 添加到总计
      total = calculate.add(total, itemTotal);
      
      // 设置项目总计
      item['total'] = itemTotal;
      
      // 尝试从商品数据库获取单位信息
      try {
        // 先检查是否已经有单位信息
        if (!item.unit_cn || !item.unit_en) {
          // 尝试从数据库中找到匹配的商品
          const merchItem = await Merch.findOne({ serialNumber: item.itemName });
          
          if (merchItem) {
            // 如果找到匹配的商品，使用其单位信息
            item.unit_cn = merchItem.unit_cn;
            item.unit_en = merchItem.unit_en;
            console.log(`Updated units from Merch DB: ${item.itemName}, unit_cn: ${item.unit_cn}, unit_en: ${item.unit_en}`);
          } else {
            // 如果在数据库中找不到，尝试从之前的订单中恢复
            if (previousOrder.items && previousOrder.items.length > 0) {
              const prevItem = previousOrder.items.find(prevItem => prevItem.itemName === item.itemName);
              if (prevItem) {
                if (!item.unit_cn) item.unit_cn = prevItem.unit_cn;
                if (!item.unit_en) item.unit_en = prevItem.unit_en;
                console.log(`Recovered units from previous order: ${item.itemName}, unit_cn: ${item.unit_cn}, unit_en: ${item.unit_en}`);
              }
            }
          }
        } else {
          console.log(`Item already has units: ${item.itemName}, unit_cn: ${item.unit_cn}, unit_en: ${item.unit_en}`);
        }
      } catch (err) {
        console.error(`Error getting unit information for ${item.itemName}:`, err);
      }
    }

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
