const mongoose = require('mongoose');
const Invoice = mongoose.model('Invoice');
const Client = mongoose.model('Client');
const Merch = mongoose.model('Merch');

/**
 * 搜索商品价格历史
 * 根据客户ID、商品序列号列表和日期范围搜索发票中的商品价格
 * 同时查找关联的采购订单中的买入价
 * 计算美金成本和毛利率
 */
const searchPriceHistory = async (req, res) => {
  try {
    const { clientId, itemNames, startDate, endDate, exchangeRate = 7, useCny = false } = req.body;

    // 验证请求参数
    if (!clientId || !itemNames || !Array.isArray(itemNames) || itemNames.length === 0) {
      return res.status(400).json({
        success: false,
        result: null,
        message: '客户ID和商品序列号列表是必需的'
      });
    }

    // 准备日期过滤条件
    const dateFilter = {};
    if (startDate) {
      dateFilter.$gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.$lte = new Date(endDate);
    }

    // 使用聚合管道查询
    const pipeline = [
      // 第一阶段：匹配符合条件的发票
      {
        $match: {
          client: new mongoose.Types.ObjectId(clientId),
          'items.itemName': { $in: itemNames },
          removed: false,
          ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {})
        }
      },
      
      // 第二阶段：按日期降序排序
      {
        $sort: { date: -1 }
      },
      
      // 第三阶段：展开items数组，使每个商品成为单独的文档
      {
        $unwind: '$items'
      },
      
      // 第四阶段：只保留请求中的商品
      {
        $match: {
          'items.itemName': { $in: itemNames }
        }
      },
      
      // 第五阶段：按商品名称分组，保留最新的记录
      {
        $group: {
          _id: '$items.itemName',
          invoiceId: { $first: '$_id' },
          invoiceNumber: { $first: '$number' },
          invoiceDate: { $first: '$date' },
          price: { $first: '$items.price' },
          currency: { $first: '$currency' },
          relatedPurchaseOrders: { $first: '$relatedPurchaseOrders' }
        }
      },
      
      // 第六阶段：查找关联的采购订单
      {
        $lookup: {
          from: 'purchaseorders', // PurchaseOrder集合名称
          let: { poIds: '$relatedPurchaseOrders', itemName: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ['$_id', { $ifNull: ['$$poIds', []] }] },
                    { $eq: ['$removed', false] }
                  ]
                }
              }
            },
            // 展开采购订单的items
            { $unwind: '$items' },
            // 只保留匹配的商品
            {
              $match: {
                $expr: { $eq: ['$items.itemName', '$$itemName'] }
              }
            },
            // 提取需要的字段
            {
              $project: {
                _id: 1,
                number: 1,
                'items.price': 1
              }
            },
            // 限制结果数量
            { $limit: 1 }
          ],
          as: 'matchedPurchaseOrders'
        }
      },
      
      // 第七阶段：格式化最终结果
      {
        $project: {
          _id: 0,
          itemName: '$_id',
          sellPrice: '$price',
          invoiceNumber: 1,
          invoiceDate: 1,
          currency: 1,
          purchasePrice: {
            $cond: {
              if: { $gt: [{ $size: '$matchedPurchaseOrders' }, 0] },
              then: { $arrayElemAt: ['$matchedPurchaseOrders.items.price', 0] },
              else: null
            }
          },
          purchaseOrderNumber: {
            $cond: {
              if: { $gt: [{ $size: '$matchedPurchaseOrders' }, 0] },
              then: { $arrayElemAt: ['$matchedPurchaseOrders.number', 0] },
              else: null
            }
          },
          purchaseOrderId: {
            $cond: {
              if: { $gt: [{ $size: '$matchedPurchaseOrders' }, 0] },
              then: { $arrayElemAt: ['$matchedPurchaseOrders._id', 0] },
              else: null
            }
          },
          hasPurchaseOrder: {
            $cond: {
              if: { $gt: [{ $size: '$matchedPurchaseOrders' }, 0] },
              then: true,
              else: false
            }
          }
        }
      }
    ];

    // 执行聚合查询
    const aggregateResults = await Invoice.aggregate(pipeline);

    // 获取所有商品的详细信息，包括VAT和ETR
    const merchDetails = await Merch.find({
      serialNumber: { $in: itemNames },
      removed: false
    }).select('serialNumber VAT ETR').lean();

    // 创建商品详情的映射，方便后续查找
    const merchMap = {};
    merchDetails.forEach(merch => {
      merchMap[merch.serialNumber] = merch;
    });

    const existingMerchItems = merchDetails.map(item => item.serialNumber);
    const nonExistingItems = itemNames.filter(item => !existingMerchItems.includes(item));

    // 初始化结果对象和日志
    const results = {};
    const logs = [];
    
    // 初始化每个商品的结果
    itemNames.forEach(itemName => {
      results[itemName] = {
        found: false,
        latestPrice: null,
        invoiceNumber: null,
        invoiceDate: null,
        currency: null,
        purchasePrice: null,
        purchaseOrderNumber: null,
        usdCost: null,
        profitMargin: null
      };
    });

    // 处理不存在的商品
    nonExistingItems.forEach(itemName => {
      logs.push(`不存在序列号为【${itemName}】的商品`);
    });

    // 处理聚合结果
    aggregateResults.forEach(item => {
      // 获取商品的VAT和ETR
      const merchInfo = merchMap[item.itemName];
      let usdCost = null;
      let profitMargin = null;
      
      if (merchInfo) {
        const { VAT, ETR } = merchInfo;
        
        if (useCny) {
          // 使用CNY计算，毛利率 = (卖出价格 - 买入价格/增值税) / 卖出价格
          if (item.sellPrice && item.purchasePrice) {
            const adjustedPurchasePrice = item.purchasePrice / VAT;
            profitMargin = (item.sellPrice - adjustedPurchasePrice) / item.sellPrice;
          }
        } else {
          // 美金成本计算公式: 买入价格 * (增值税 - 退税率) / 增值税 / 汇率
          if (item.purchasePrice) {
            usdCost = item.purchasePrice * (VAT - ETR) / VAT / exchangeRate;
            
            // 如果有卖出价格，计算毛利率
            if (item.sellPrice) {
              // 毛利率计算公式: (卖出价格 - 美金成本) / 卖出价格
              profitMargin = (item.sellPrice - usdCost) / item.sellPrice;
            }
          }
        }
      }
      
      results[item.itemName] = {
        found: true,
        latestPrice: item.sellPrice,
        invoiceNumber: item.invoiceNumber,
        invoiceDate: item.invoiceDate,
        currency: item.currency,
        purchasePrice: item.purchasePrice,
        purchaseOrderNumber: item.purchaseOrderNumber,
        usdCost: !useCny && usdCost ? parseFloat(usdCost.toFixed(2)) : null,
        profitMargin: profitMargin ? parseFloat(profitMargin.toFixed(4)) : null,
        useCny: useCny
      };
      
      // 生成日志
      if (item.hasPurchaseOrder) {
        logs.push(`商品【${item.itemName}】于形式发票【${item.invoiceNumber}】和采购合同【${item.purchaseOrderNumber}】中被搜索到`);
      } else {
        logs.push(`商品【${item.itemName}】于形式发票【${item.invoiceNumber}】中被搜索到`);
      }
    });

    // 处理存在但未找到价格的商品
    itemNames.forEach(itemName => {
      if (existingMerchItems.includes(itemName) && !results[itemName].found) {
        logs.push(`没有序列号为【${itemName}】的商品记录`);
      }
    });

    return res.status(200).json({
      success: true,
      result: {
        items: results,
        logs: logs,
        useCny: useCny
      },
      message: '价格历史搜索完成'
    });
  } catch (error) {
    console.error('搜索价格历史时出错:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: error.message,
      error: error
    });
  }
};

module.exports = searchPriceHistory; 