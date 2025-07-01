const mongoose = require('mongoose');
const Invoice = mongoose.model('Invoice');
const Client = mongoose.model('Client');
const Merch = mongoose.model('Merch');
const PurchaseOrder = mongoose.model('PurchaseOrder');

/**
 * 全面比较功能
 * 根据发票ID获取发票和关联的采购订单信息，计算每个商品的利润率和退税
 * 同时计算总体摘要信息
 */
const fullComparison = async (req, res) => {
  try {
    const { invoiceId, exchangeRate = 7, conversionRate = 7, useCny = false } = req.body;

    // 验证请求参数
    if (!invoiceId) {
      return res.status(400).json({
        success: false,
        result: null,
        message: '发票ID是必需的'
      });
    }

    // 查询发票及其关联的采购订单
    const invoice = await Invoice.findById(invoiceId)
      .populate({
        path: 'relatedPurchaseOrders',
        match: { removed: false }
      })
      .lean();

    if (!invoice) {
      return res.status(404).json({
        success: false,
        result: null,
        message: '未找到指定的发票'
      });
    }

    // 提取发票中的所有商品序列号
    const itemNames = invoice.items.map(item => item.itemName);

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

    // 初始化结果对象
    const itemResults = [];
    const poSummary = {};
    const logs = [];
    
    // 处理每个商品
    for (const item of invoice.items) {
      const itemName = item.itemName;
      const merchInfo = merchMap[itemName];
      
      // 初始化商品结果
      const itemResult = {
        itemName,
        sellPrice: item.price,
        currency: invoice.currency,
        purchasePrice: null,
        purchaseOrderNumber: null,
        usdCost: null,
        profitMargin: null,
        taxRefund: null
      };
      
      // 查找商品在采购订单中的信息
      let purchaseInfo = null;
      
      // 遍历关联的采购订单
      for (const po of invoice.relatedPurchaseOrders || []) {
        // 查找采购订单中匹配的商品
        const poItem = po.items.find(poItem => poItem.itemName === itemName);
        
        if (poItem) {
          purchaseInfo = {
            price: poItem.price,
            poNumber: po.number,
            poId: po._id
          };
          break;
        }
      }
      
      // 如果找到采购信息并且有商品VAT/ETR信息
      if (purchaseInfo && merchInfo) {
        const { VAT, ETR } = merchInfo;
        itemResult.purchasePrice = purchaseInfo.price;
        itemResult.purchaseOrderNumber = purchaseInfo.poNumber;
        
        // 计算退税
        const taxRefund = purchaseInfo.price * ETR / VAT;
        itemResult.taxRefund = parseFloat(taxRefund.toFixed(2));
        
        // 根据是否使用人民币计算不同的成本和利润率
        if (useCny) {
          // 使用人民币计算，毛利率 = (卖出价格 - 买入价格/增值税) / 卖出价格
          const adjustedPurchasePrice = purchaseInfo.price / VAT;
          itemResult.profitMargin = (item.price - adjustedPurchasePrice) / item.price;
        } else {
          // 美金成本计算公式: 买入价格 * (增值税 - 退税率) / 增值税 / 汇率
          const usdCost = purchaseInfo.price * (VAT - ETR) / VAT / exchangeRate;
          itemResult.usdCost = parseFloat(usdCost.toFixed(2));
          
          // 毛利率计算公式: (卖出价格 - 美金成本) / 卖出价格
          itemResult.profitMargin = (item.price - usdCost) / item.price;
        }
        
        // 格式化毛利率
        itemResult.profitMargin = parseFloat(itemResult.profitMargin.toFixed(4));
        
        // 更新采购订单摘要
        if (!poSummary[purchaseInfo.poNumber]) {
          poSummary[purchaseInfo.poNumber] = {
            poNumber: purchaseInfo.poNumber,
            poId: purchaseInfo.poId,
            totalAmount: 0,
            totalTaxRefund: 0,
            items: []
          };
        }
        
        poSummary[purchaseInfo.poNumber].totalAmount += purchaseInfo.price;
        poSummary[purchaseInfo.poNumber].totalTaxRefund += taxRefund;
        poSummary[purchaseInfo.poNumber].items.push({
          itemName,
          price: purchaseInfo.price,
          taxRefund: parseFloat(taxRefund.toFixed(2))
        });
      } else {
        // 记录未找到采购信息的商品
        logs.push(`未找到商品【${itemName}】的采购信息或商品详情`);
      }
      
      itemResults.push(itemResult);
    }
    
    // 计算总体摘要
    const totalPurchaseAmount = Object.values(poSummary).reduce((sum, po) => sum + po.totalAmount, 0);
    const totalTaxRefund = Object.values(poSummary).reduce((sum, po) => sum + po.totalTaxRefund, 0);
    
    // 计算发票总额（人民币）
    const invoiceTotalCny = useCny ? invoice.total : invoice.total * conversionRate;
    
    // 计算总毛利润
    const totalProfit = invoiceTotalCny + totalTaxRefund - totalPurchaseAmount;
    
    // 计算整体毛利率
    const overallProfitMargin = totalProfit / (totalPurchaseAmount - totalTaxRefund);
    
    // 格式化采购订单摘要
    Object.values(poSummary).forEach(po => {
      po.totalAmount = parseFloat(po.totalAmount.toFixed(2));
      po.totalTaxRefund = parseFloat(po.totalTaxRefund.toFixed(2));
    });
    
    // 返回结果
    return res.status(200).json({
      success: true,
      result: {
        invoice: {
          id: invoice._id,
          number: invoice.number,
          date: invoice.date,
          total: invoice.total,
          currency: invoice.currency
        },
        items: itemResults,
        poSummary: Object.values(poSummary),
        summary: {
          invoiceTotal: invoice.total,
          invoiceCurrency: invoice.currency,
          invoiceTotalCny: parseFloat(invoiceTotalCny.toFixed(2)),
          purchaseTotal: parseFloat(totalPurchaseAmount.toFixed(2)),
          taxRefundTotal: parseFloat(totalTaxRefund.toFixed(2)),
          profit: parseFloat(totalProfit.toFixed(2)),
          profitMargin: parseFloat(overallProfitMargin.toFixed(4))
        },
        useCny: useCny,
        logs
      },
      message: '全面比较计算完成'
    });
    
  } catch (error) {
    console.error('全面比较计算出错:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: `计算出错: ${error.message}`,
      error: error
    });
  }
};

module.exports = fullComparison; 