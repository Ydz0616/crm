const { generateExcel } = require('./excelService');
const Invoice = require('@/models/appModels/Invoice');
const Quote = require('@/models/appModels/Quote');
const PurchaseOrder = require('@/models/appModels/PurchaseOrder');
const mongoose = require('mongoose');

/**
 * 导出 Invoice 为 Excel
 */
exports.exportInvoiceToExcel = async (req, res) => {
  try {
    const { id } = req.params;
    
    let query = {};
    if (id) {
      query._id = id;
    } else {
      query = { removed: false };
    }
    
    const invoices = await Invoice.find(query)
      .populate('client')
      .lean();
    
    if (!invoices || invoices.length === 0) {
      return res.status(404).json({
        success: false,
        message: '没有找到发票数据'
      });
    }
    
    // 处理每个发票
    for (const invoice of invoices) {
      // 定义列宽和对齐方式
      const columnDefinitions = [
        { key: 'sn', header: 'S/N', width: 8 },
        { key: 'refNumber', header: 'Ref. Number', width: 15 },
        { key: 'description', header: 'Description', width: 30 },
        { key: 'quantity', header: 'Q\'TY', width: 10 },
        { key: 'unit', header: 'Unit', width: 10 },
        { key: 'unitPrice', header: 'Unit Price', width: 15 },
        { key: 'totalAmount', header: 'Total Amount', width: 15 }
      ];
      
      // 设置对齐方式
      const alignments = [
        { vertical: 'middle', horizontal: 'center' }, // S/N
        { vertical: 'middle', horizontal: 'center' }, // Ref. Number
        { vertical: 'middle', horizontal: 'center' }, // Description
        { vertical: 'middle', horizontal: 'center' }, // Q'TY
        { vertical: 'middle', horizontal: 'center' }, // Unit
        { vertical: 'middle', horizontal: 'center' }, // Unit Price
        { vertical: 'middle', horizontal: 'center' }  // Total Amount
      ];
      
      // 准备表头
      const headers = ['S/N', 'Ref. Number', 'Description', 'Q\'TY', 'Unit', 'Unit Price', 'Total Amount'];
      
      // 准备数据行
      const rows = [];
      
      // 添加商品明细
      if (invoice.items && invoice.items.length > 0) {
        invoice.items.forEach((item, index) => {
          rows.push([
            index + 1,                       // S/N
            item.itemName || '',             // Ref. Number
            item.description || '',          // Description
            item.quantity || 0,              // Q'TY
            item.unit_en || '',              // Unit
            item.price || 0,                 // Unit Price
            item.total || 0                  // Total Amount
          ]);
        });
      }
      
      // 准备文档头部信息
      const documentHeader = {
        title: 'Invoice',
        alignment: 'left',
        details: [
          `P/I No.: ${invoice.number}/${invoice.year || ''}`,
          `Date: ${new Date(invoice.date).toLocaleDateString()}`
        ]
      };
      
      // 准备公司信息
      const companyInfo = {
        'company': 'WEIFANG ROYALROAD TRADING CO., LTD.',
        'address': 'NO.360 DongFeng East Str, WeiFang City, 261041, P.R China',
        'phone': '+86-536-8296032',
        'email': 'andy@plasmcut.com'
      };
      
      // 准备客户信息
      const clientInfo = {
        'name': invoice.client ? invoice.client.name : '',
        'address': invoice.client ? invoice.client.address : '',
        'phone': invoice.client ? invoice.client.phone : '',
        'email': invoice.client ? invoice.client.email : '',
        'ship': 'The buyer\'s carrier-designated address'
      };
      
      // 准备小计、运费和总计
      const summary = [
        { 
          label: 'SUB TOTAL', 
          value: invoice.subTotal || 0
        },
        { 
          label: 'FREIGHT', 
          value: invoice.freight || 0
        }
      ];
      
      // 如果有折扣，添加折扣行; 如果没有，添加默认为0的折扣行
      summary.push({ 
        label: 'DISCOUNT', 
        value: invoice.discount || 0
      });
      
      // 添加总计行
      summary.push({ 
        label: 'TOTAL DUE', 
        value: invoice.total || 0,
        isTotal: true 
      });
      
      // 添加页脚文本
      const footerText = 'THIS DOCUMENT IS FOR REFERENCE ONLY; IT IS INVALID WITHOUT STAMP AND SIGNATURE';
      
      // 生成 Excel
      const excelOptions = {
        sheetName: 'Invoice',
        columnDefinitions,
        alignments,
        headers,
        documentHeader,
        companyInfo,
        clientInfo,
        summary,
        summaryStartCol: 6, // 小计行的标签从第6列开始
        summaryValueCol: 7, // 小计行的值在第7列
        footerText,
        numberFormatCols: [4, 6, 7], // 设置金额列的格式 (Q'TY, Unit Price, Total Amount)
        includeHeaders: false // 不包含表头行
      };
      
      const buffer = await generateExcel(rows, excelOptions);
      
      // 设置响应头并发送
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=invoice_${invoice.number}_${invoice.year || ''}_export_${Date.now()}.xlsx`);
      res.send(buffer);
      
      // 只处理第一个发票（如果有多个）
      break;
    }
  } catch (error) {
    console.error('导出 Invoice Excel 错误:', error);
    res.status(500).json({
      success: false,
      message: '导出失败',
      error: error.message
    });
  }
};

/**
 * 导出 Quote 为 Excel
 */
exports.exportQuoteToExcel = async (req, res) => {
  try {
    const { id } = req.params;
    
    let query = {};
    if (id) {
      query._id = id;
    } else {
      query = { removed: false };
    }
    
    const quotes = await Quote.find(query)
      .populate('client')
      .lean();
    
    if (!quotes || quotes.length === 0) {
      return res.status(404).json({
        success: false,
        message: '没有找到报价数据'
      });
    }
    
    // 处理每个报价单
    for (const quote of quotes) {
      // 定义列宽和对齐方式
      const columnDefinitions = [
        { key: 'sn', header: 'S/N', width: 8 },
        { key: 'refNumber', header: 'Ref. Number', width: 15 },
        { key: 'description', header: 'Description', width: 30 },
        { key: 'quantity', header: 'Q\'TY', width: 10 },
        { key: 'unit', header: 'Unit', width: 10 },
        { key: 'unitPrice', header: 'Unit Price', width: 15 },
        { key: 'totalAmount', header: 'Total Amount', width: 15 }
      ];
      
      // 设置对齐方式
      const alignments = [
        { vertical: 'middle', horizontal: 'center' }, // S/N
        { vertical: 'middle', horizontal: 'center' }, // Ref. Number
        { vertical: 'middle', horizontal: 'center' }, // Description
        { vertical: 'middle', horizontal: 'center' }, // Q'TY
        { vertical: 'middle', horizontal: 'center' }, // Unit
        { vertical: 'middle', horizontal: 'center' }, // Unit Price
        { vertical: 'middle', horizontal: 'center' }  // Total Amount
      ];
      
      // 准备表头
      const headers = ['S/N', 'Ref. Number', 'Description', 'Q\'TY', 'Unit', 'Unit Price', 'Total Amount'];
      
      // 准备数据行
      const rows = [];
      
      // 添加商品明细
      if (quote.items && quote.items.length > 0) {
        quote.items.forEach((item, index) => {
          rows.push([
            index + 1,                       // S/N
            item.itemName || '',             // Ref. Number
            item.description || '',          // Description
            item.quantity || 0,              // Q'TY
            item.unit_en || '',              // Unit
            item.price || 0,                 // Unit Price
            item.total || 0                  // Total Amount
          ]);
        });
      }
      
      // 准备文档头部信息
      const documentHeader = {
        title: 'Quote',
        alignment: 'left',
        details: [
          `Quote No.: ${quote.number}/${quote.year || ''}`,
          `Date: ${new Date(quote.date).toLocaleDateString()}`,
          quote.expiredDate ? `Expired Date: ${new Date(quote.expiredDate).toLocaleDateString()}` : ''
        ].filter(Boolean)
      };
      
      // 准备公司信息
      const companyInfo = {
        'company': 'WEIFANG ROYALROAD TRADING CO., LTD.',
        'address': 'NO.360 DongFeng East Str, WeiFang City, 261041, P.R China',
        'phone': '+86-536-8296032',
        'email': 'andy@plasmcut.com'
      };
      
      // 准备客户信息
      const clientInfo = {
        'name': quote.client ? quote.client.name : '',
        'address': quote.client ? quote.client.address : '',
        'phone': quote.client ? quote.client.phone : '',
        'email': quote.client ? quote.client.email : '',
        'ship': 'The buyer\'s carrier-designated address'
      };
      
      // 准备小计、运费和总计
      const summary = [
        { 
          label: 'SUB TOTAL', 
          value: quote.subTotal || 0
        },
        { 
          label: 'FREIGHT', 
          value: quote.freight || 0
        }
      ];
      
      // 如果有折扣，添加折扣行; 如果没有，添加默认为0的折扣行
      summary.push({ 
        label: 'DISCOUNT', 
        value: quote.discount || 0
      });
      
      // 添加总计行
      summary.push({ 
        label: 'TOTAL DUE', 
        value: quote.total || 0,
        isTotal: true 
      });
      
      // 添加页脚文本
      const footerText = 'THIS DOCUMENT IS FOR REFERENCE ONLY; IT IS INVALID WITHOUT STAMP AND SIGNATURE';
      
      // 生成 Excel
      const excelOptions = {
        sheetName: 'Quote',
        columnDefinitions,
        alignments,
        headers,
        documentHeader,
        companyInfo,
        clientInfo,
        summary,
        summaryStartCol: 6, // 小计行的标签从第6列开始
        summaryValueCol: 7, // 小计行的值在第7列
        footerText,
        numberFormatCols: [4, 6, 7], // 设置金额列的格式 (Q'TY, Unit Price, Total Amount)
        includeHeaders: false // 不包含表头行
      };
      
      const buffer = await generateExcel(rows, excelOptions);
      
      // 设置响应头并发送
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=quote_${quote.number}_${quote.year || ''}_export_${Date.now()}.xlsx`);
      res.send(buffer);
      
      // 只处理第一个报价单（如果有多个）
      break;
    }
  } catch (error) {
    console.error('导出 Quote Excel 错误:', error);
    res.status(500).json({
      success: false,
      message: '导出失败',
      error: error.message
    });
  }
};

/**
 * 导出 Purchase Order 为 Excel
 */
exports.exportPurchaseOrderToExcel = async (req, res) => {
  try {
    console.log('导出采购订单为Excel: 开始处理请求');
    console.log('请求参数:', req.params);
    
    const { id } = req.params;
    
    let query = {};
    if (id) {
      query._id = id;
      console.log('查询单个采购订单:', id);
    } else {
      query = { removed: false };
      console.log('查询所有未删除的采购订单');
    }
    
    const purchaseOrders = await PurchaseOrder.find(query)
      .populate('factory')
      .lean();
    
    if (!purchaseOrders || purchaseOrders.length === 0) {
      return res.status(404).json({
        success: false,
        message: '没有找到采购订单数据'
      });
    }
    
    // 处理每个采购订单
    for (const order of purchaseOrders) {
      // 定义列宽和对齐方式
      const columnDefinitions = [
        { key: 'sn', header: '序号', width: 8 },
        { key: 'itemCode', header: '货号', width: 15 },
        { key: 'productName', header: '产品名称', width: 25 },
        { key: 'laserContent', header: '激光内容', width: 20 },
        { key: 'quantity', header: '数量', width: 10 },
        { key: 'unit', header: '单位', width: 10 },
        { key: 'unitPrice', header: '单价(含税)', width: 15 },
        { key: 'totalPrice', header: '税价合计', width: 15 }
      ];
      
      // 设置对齐方式
      const alignments = [
        { vertical: 'middle', horizontal: 'center' }, // 序号
        { vertical: 'middle', horizontal: 'center' }, // 货号
        { vertical: 'middle', horizontal: 'center' }, // 产品名称
        { vertical: 'middle', horizontal: 'center' }, // 激光内容
        { vertical: 'middle', horizontal: 'center' }, // 数量
        { vertical: 'middle', horizontal: 'center' }, // 单位
        { vertical: 'middle', horizontal: 'center' }, // 单价(含税)
        { vertical: 'middle', horizontal: 'center' }  // 税价合计
      ];
      
      // 准备表头
      const headers = ['序号', '货号', '产品名称', '激光内容', '数量', '单位', '单价(含税)', '税价合计'];
      
      // 准备数据行
      const rows = [];
      
      // 添加商品明细
      if (order.items && order.items.length > 0) {
        order.items.forEach((item, index) => {
          rows.push([
            index + 1,                  // 序号
            item.itemName || '',        // 货号
            item.description || '',     // 产品名称
            item.laser || '',           // 激光内容
            item.quantity || 0,         // 数量
            item.unit_cn || '',         // 单位
            item.price || 0,            // 单价(含税)
            item.total || 0             // 税价合计
          ]);
        });
      }
      
      // 准备文档头部信息
      const documentHeader = {
        title: '采购合同',
        alignment: 'left',
        details: [
          `合同编号: ${order.number}/${order.year || ''}`,
          `签订时间: ${new Date(order.date).toLocaleDateString()}`
        ]
      };
      
      // 准备公司信息
      const companyInfo = {
        'company': '潍坊景程贸易有限公司',
        'address': '潍坊市奎文区东风东街360号泰华商务大厦1509号',
        'phone': '+86-536-8296032',
        'email': 'andy@plasmcut.com'
      };
      
      // 准备供货方信息
      const factoryInfo = {
        'name': order.factory ? order.factory.factory_name : '',
        'address': order.factory ? order.factory.location : '',
        'phone': order.factory ? order.factory.contact : ''
      };
      
      // 添加总计行
      const summary = [
        { 
          label: '合计人民币金额', 
          value: order.total || 0,
          isTotal: true 
        }
      ];
      
      // 添加页脚文本
      const footerText = '此文档仅供参考；无印章及签名无效';
      
      // 生成 Excel
      const excelOptions = {
        sheetName: '采购订单',
        columnDefinitions,
        alignments,
        documentHeader,
        headers,
        companyInfo,
        clientInfo: factoryInfo,
        summary,
        summaryStartCol: 7, // 小计行的标签从第7列开始
        summaryValueCol: 8, // 小计行的值在第8列
        footerText,
        numberFormatCols: [5, 7, 8], // 设置金额列的格式 (数量, 单价, 税价合计)
        includeHeaders: false // 不包含表头行
      };
      
      const buffer = await generateExcel(rows, excelOptions);
      
      // 设置响应头并发送
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=purchase_order_${order.number}_${order.year || ''}_export_${Date.now()}.xlsx`);
      res.send(buffer);
      
      // 只处理第一个采购订单（如果有多个）
      break;
    }
  } catch (error) {
    console.error('导出 Purchase Order Excel 错误:', error);
    res.status(500).json({
      success: false,
      message: '导出失败',
      error: error.message
    });
  }
}; 