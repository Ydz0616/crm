const mongoose = require('mongoose');

const Model = mongoose.model('Quote');
const Merch = mongoose.model('Merch');

const custom = require('@/controllers/pdfController');
const { increaseBySettingKey } = require('@/middlewares/settings');
const { calculate } = require('@/helpers');
const schema = require('./schemaValidate');

const create = async (req, res) => {
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

  const { items = [], freight = 0, discount = 0 } = value;

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
  body['createdBy'] = req.admin._id;

  // Creating a new document in the collection
  const result = await new Model(body).save();
  const fileId = 'quote-' + result._id + '.pdf';
  const updateResult = await Model.findOneAndUpdate(
    { _id: result._id },
    { pdf: fileId },
    {
      new: true,
    }
  ).exec();
  // Returning successfull response

  increaseBySettingKey({
    settingKey: 'last_quote_number',
  });

  // Returning successfull response
  return res.status(200).json({
    success: true,
    result: updateResult,
    message: 'Quote created successfully',
  });
};

module.exports = create;
