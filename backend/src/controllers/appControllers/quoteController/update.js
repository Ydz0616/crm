const mongoose = require('mongoose');

const Model = mongoose.model('Quote');
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

  // Currency / exchangeRate 业务校验（Joi 之后）
  const userPassedExchangeRate = body.exchangeRate !== undefined && body.exchangeRate !== null;
  if (value.currency === 'CNY') {
    if (!userPassedExchangeRate || Number(value.exchangeRate) <= 1) {
      return res.status(400).json({
        success: false,
        result: null,
        message: '人民币报价必须填写汇率（必须大于 1），禁止使用默认值',
      });
    }
  } else if (value.currency === 'USD') {
    if (userPassedExchangeRate && Number(body.exchangeRate) !== 1) {
      return res.status(400).json({
        success: false,
        result: null,
        message: '美元报价的汇率必须为 1，禁止自定义',
      });
    }
    value.exchangeRate = 1;
  }

  const previousQuote = await Model.findOne({
    _id: req.params.id,
    removed: false,
    createdBy: req.admin._id,
  });

  const { items = [], freight = 0, discount = 0 } = value;

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
          // 如果在数据库中找不到，尝试从之前的报价中恢复
          if (previousQuote && previousQuote.items && previousQuote.items.length > 0) {
            const prevItem = previousQuote.items.find(prevItem => prevItem.itemName === item.itemName);
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
  body['currency'] = value.currency;
  body['exchangeRate'] = value.exchangeRate;
  body['pdf'] = 'quote-' + req.params.id + '.pdf';

  // Find document by id and updates with the required fields

  const result = await Model.findOneAndUpdate({ _id: req.params.id, removed: false, createdBy: req.admin._id }, body, {
    new: true, // return the new result instead of the old one
  }).exec();

  if (!result) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'Quote not found or not owned by current user',
    });
  }

  return res.status(200).json({
    success: true,
    result,
    message: 'Quote successfully updated',
  });
};

module.exports = update;
