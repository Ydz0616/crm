const mongoose = require('mongoose');

const Model = mongoose.model('PurchaseOrder');
const Invoice = mongoose.model('Invoice');
const Merch = mongoose.model('Merch');

const custom = require('@/controllers/pdfController');
const { increaseBySettingKey } = require('@/middlewares/settings');
const { calculate } = require('@/helpers');

const create = async (req, res) => {
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
