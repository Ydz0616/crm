const mongoose = require('mongoose');

const Model = mongoose.model('Invoice');
const Merch = mongoose.model('Merch');

const custom = require('@/controllers/pdfController');

const { calculate } = require('@/helpers');
const schema = require('./schemaValidate');

const update = async (req, res) => {
  let body = req.body;

  const { error, value } = schema.validate(body);
  if (error) {
    const { details } = error;
    return res.status(400).json({
      success: false,
      result: null,
      message: details[0]?.message,
    });
  }

  const previousInvoice = await Model.findOne({
    _id: req.params.id,
    removed: false,
  });

  const { credit } = previousInvoice;

  const { items = [], freight = 0, discount = 0 } = req.body;

  if (items.length === 0) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Items cannot be empty',
    });
  }

  // default
  let subTotal = 0;
  let total = 0;

  // 处理每个项目，确保单位信息存在
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    let itemTotal = calculate.multiply(item['quantity'], item['price']);
    
    // 添加到总计
    subTotal = calculate.add(subTotal, itemTotal);
    
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
        } else {
          // 如果在数据库中找不到，尝试从之前的订单中恢复
          if (previousInvoice.items && previousInvoice.items.length > 0) {
            const prevItem = previousInvoice.items.find(prevItem => prevItem.itemName === item.itemName);
            if (prevItem) {
              if (!item.unit_cn) item.unit_cn = prevItem.unit_cn;
              if (!item.unit_en) item.unit_en = prevItem.unit_en;
            }
          }
        }
      }
    } catch (err) {
      console.error(`Error getting unit information for ${item.itemName}:`, err);
    }
  }
  
  // 计算总价 = 小计 + 运费 - 折扣
  const freightTotal = calculate.add(subTotal, freight);
  total = calculate.sub(freightTotal, discount);

  body['subTotal'] = subTotal;
  body['freight'] = freight;
  body['discount'] = discount;
  body['total'] = total;
  body['items'] = items;
  body['pdf'] = 'invoice-' + req.params.id + '.pdf';

  // Find document by id and updates with the required fields

  let paymentStatus =
    calculate.sub(total, 0) === credit ? 'paid' : credit > 0 ? 'partially' : 'unpaid';
  body['paymentStatus'] = paymentStatus;

  const result = await Model.findOneAndUpdate({ _id: req.params.id, removed: false }, body, {
    new: true, // return the new result instead of the old one
  }).exec();

  // Returning successfull response

  return res.status(200).json({
    success: true,
    result,
    message: 'Invoice successfully updated',
  });
};

module.exports = update;
