const mongoose = require('mongoose');
const Quote = require('@/models/appModels/Quote');

const copy = async (req, res) => {
  try {
    const { id } = req.params;

    // 查找要复制的报价单
    const sourceQuote = await Quote.findById(id);
    
    if (!sourceQuote) {
      return res.status(404).json({
        success: false,
        result: null,
        message: '未找到要复制的报价单',
      });
    }

    // 创建新报价单对象，复制原始报价单的数据
    const newQuote = new Quote({
      number: 'copy', // 简化为固定值"copy"
      year: new Date().getFullYear(),
      date: new Date(),
      expiredDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 默认30天有效期
      client: sourceQuote.client,
      items: sourceQuote.items,
      taxRate: sourceQuote.taxRate,
      subTotal: sourceQuote.subTotal,
      taxTotal: sourceQuote.taxTotal,
      total: sourceQuote.total,
      discount: sourceQuote.discount,
      notes: sourceQuote.notes,
      status: 'draft', // 新报价单的状态设置为草稿
      currency: sourceQuote.currency,
      shipping: sourceQuote.shipping,
      freight: sourceQuote.freight,
      termsOfDelivery: sourceQuote.termsOfDelivery,
      shippingMark: sourceQuote.shippingMark,
      packaging: sourceQuote.packaging,
      shipmentDocuments: sourceQuote.shipmentDocuments,
      paymentTerms: sourceQuote.paymentTerms,
      bankDetails: sourceQuote.bankDetails,
      createdBy: req.admin._id // 添加创建者ID
    });

    // 保存新报价单
    const result = await newQuote.save();

    return res.status(200).json({
      success: true,
      result,
      message: '报价单复制成功',
    });
  } catch (error) {
    console.error('复制报价单时出错:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: '复制报价单时出错',
      error: error.message,
    });
  }
};



module.exports = copy; 