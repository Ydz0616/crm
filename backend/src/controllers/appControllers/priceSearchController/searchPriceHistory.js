const mongoose = require('mongoose');
const Invoice = mongoose.model('Invoice');
const Client = mongoose.model('Client');
const Merch = mongoose.model('Merch');

/**
 * 搜索商品价格历史
 * 根据客户ID、商品序列号列表和日期范围搜索发票中的商品价格
 * 同时查找关联的采购订单中的买入价
 */
const searchPriceHistory = async (req, res) => {
  try {
    const { clientId, itemNames, startDate, endDate } = req.body;

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

    // 检查每个商品是否存在于Merch集合中
    const merchResults = await Merch.find({
      serialNumber: { $in: itemNames },
      removed: false
    }).select('serialNumber').lean();

    const existingMerchItems = merchResults.map(item => item.serialNumber);
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
        purchaseOrderNumber: null
      };
    });

    // 处理不存在的商品
    nonExistingItems.forEach(itemName => {
      logs.push(`不存在序列号为【${itemName}】的商品`);
    });

    // 处理聚合结果
    aggregateResults.forEach(item => {
      results[item.itemName] = {
        found: true,
        latestPrice: item.sellPrice,
        invoiceNumber: item.invoiceNumber,
        invoiceDate: item.invoiceDate,
        currency: item.currency,
        purchasePrice: item.purchasePrice,
        purchaseOrderNumber: item.purchaseOrderNumber
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
        logs: logs
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