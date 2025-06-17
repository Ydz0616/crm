const mongoose = require('mongoose');
const PurchaseOrder = require('@/models/appModels/PurchaseOrder');

const copy = async (req, res) => {
  try {
    const { id } = req.params;

    // 查找要复制的采购订单
    const sourcePurchaseOrder = await PurchaseOrder.findById(id);
    
    if (!sourcePurchaseOrder) {
      return res.status(404).json({
        success: false,
        result: null,
        message: '未找到要复制的采购订单',
      });
    }

    // 创建新采购订单对象，复制原始采购订单的数据
    const newPurchaseOrder = new PurchaseOrder({
      number: 'copy', // 简化为固定值"copy"
      year: new Date().getFullYear(),
      date: new Date(),
      expiredDate: sourcePurchaseOrder.expiredDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 添加过期日期，如果原订单没有则默认30天
      factory: sourcePurchaseOrder.factory,
      items: sourcePurchaseOrder.items,
      subTotal: sourcePurchaseOrder.subTotal,
      total: sourcePurchaseOrder.total,
      discount: sourcePurchaseOrder.discount,
      notes: sourcePurchaseOrder.notes,
      status: 'draft', // 新采购订单的状态设置为草稿
      currency: sourcePurchaseOrder.currency,
      freight: sourcePurchaseOrder.freight,
      createdBy: req.admin._id // 添加创建者ID
    });

    // 保存新采购订单
    const result = await newPurchaseOrder.save();

    return res.status(200).json({
      success: true,
      result,
      message: '采购订单复制成功',
    });
  } catch (error) {
    console.error('复制采购订单时出错:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: '复制采购订单时出错',
      error: error.message,
    });
  }
};

module.exports = copy; 