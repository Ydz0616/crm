const mongoose = require('mongoose');
const Invoice = require('@/models/appModels/Invoice');

const copy = async (req, res) => {
  try {
    const { id } = req.params;

    // 查找要复制的发票
    const sourceInvoice = await Invoice.findById(id);
    
    if (!sourceInvoice) {
      return res.status(404).json({
        success: false,
        result: null,
        message: '未找到要复制的发票',
      });
    }

    // 创建新发票对象，复制原始发票的数据
    const newInvoice = new Invoice({
      number: 'copy', // 简化为固定值"copy"
      year: new Date().getFullYear(),
      date: new Date(),
      expiredDate: sourceInvoice.expiredDate,
      client: sourceInvoice.client,
      items: sourceInvoice.items,
      taxRate: sourceInvoice.taxRate,
      subTotal: sourceInvoice.subTotal,
      taxTotal: sourceInvoice.taxTotal,
      total: sourceInvoice.total,
      credit: 0, // 新发票的已付金额为0
      discount: sourceInvoice.discount,
      notes: sourceInvoice.notes,
      status: 'draft', // 新发票的状态设置为草稿
      paymentStatus: 'unpaid', // 新发票的支付状态设置为未付款
      currency: sourceInvoice.currency,
      shipping: sourceInvoice.shipping,
      freight: sourceInvoice.freight,
      termsOfDelivery: sourceInvoice.termsOfDelivery,
      shippingMark: sourceInvoice.shippingMark,
      packaging: sourceInvoice.packaging,
      shipmentDocuments: sourceInvoice.shipmentDocuments,
      paymentTerms: sourceInvoice.paymentTerms,
      bankDetails: sourceInvoice.bankDetails,
      createdBy: req.admin._id // 添加创建者ID
    });

    // 保存新发票
    const result = await newInvoice.save();

    return res.status(200).json({
      success: true,
      result,
      message: '发票复制成功',
    });
  } catch (error) {
    console.error('复制发票时出错:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: '复制发票时出错',
      error: error.message,
    });
  }
};



module.exports = copy; 