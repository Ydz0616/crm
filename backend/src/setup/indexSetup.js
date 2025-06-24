const mongoose = require('mongoose');

// 设置索引的函数
const setupIndexes = async () => {
  try {
    console.log('开始设置数据库索引...');
    
    // 获取模型引用
    const Invoice = mongoose.model('Invoice');
    const Client = mongoose.model('Client');
    const PurchaseOrder = mongoose.model('PurchaseOrder');
    
    // 为Invoice创建复合索引
    await Invoice.collection.createIndex(
      { 
        client: 1,        // 客户ID
        date: -1,         // 日期降序排序
        removed: 1        // 是否已删除
      }, 
      { 
        name: 'invoice_client_date_idx',
        background: true  // 后台创建索引，不阻塞其他操作
      }
    );
    console.log('Invoice客户日期索引创建成功');
    
    // 为Invoice的items.itemName创建索引
    await Invoice.collection.createIndex(
      { 
        'items.itemName': 1,  // 商品名称
        removed: 1            // 是否已删除
      }, 
      { 
        name: 'invoice_items_idx',
        background: true
      }
    );
    console.log('Invoice商品名称索引创建成功');
    
    // 为Invoice创建复合索引（客户+商品+日期）
    await Invoice.collection.createIndex(
      { 
        client: 1,           // 客户ID
        'items.itemName': 1, // 商品名称
        date: -1,            // 日期降序排序
        removed: 1           // 是否已删除
      }, 
      { 
        name: 'invoice_client_item_date_idx',
        background: true
      }
    );
    console.log('Invoice客户商品日期复合索引创建成功');
    
    // 为Client创建国家索引
    await Client.collection.createIndex(
      { 
        country: 1,   // 国家
        removed: 1    // 是否已删除
      }, 
      { 
        name: 'client_country_idx',
        background: true
      }
    );
    console.log('Client国家索引创建成功');
    
    // 为PurchaseOrder创建商品索引
    await PurchaseOrder.collection.createIndex(
      { 
        'items.itemName': 1,  // 商品名称
        removed: 1            // 是否已删除
      }, 
      { 
        name: 'po_items_idx',
        background: true
      }
    );
    console.log('PurchaseOrder商品名称索引创建成功');
    
    // 为PurchaseOrder创建ID和商品名称的复合索引，用于优化关联查询
    await PurchaseOrder.collection.createIndex(
      { 
        _id: 1,              // PO ID
        'items.itemName': 1, // 商品名称
        removed: 1           // 是否已删除
      }, 
      { 
        name: 'po_id_items_idx',
        background: true
      }
    );
    console.log('PurchaseOrder ID和商品名称复合索引创建成功');
    
    // 为Invoice创建relatedPurchaseOrders索引，优化关联查询
    await Invoice.collection.createIndex(
      { 
        relatedPurchaseOrders: 1,  // 关联的采购订单
        removed: 1                 // 是否已删除
      }, 
      { 
        name: 'invoice_related_po_idx',
        background: true
      }
    );
    console.log('Invoice关联采购订单索引创建成功');
    
    console.log('所有索引设置完成！');
  } catch (error) {
    console.error('设置索引时出错:', error);
  }
};

module.exports = setupIndexes; 