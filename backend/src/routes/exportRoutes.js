const express = require('express');
const router = express.Router();
const { catchErrors } = require('@/handlers/errorHandlers');

const {
  exportInvoiceToExcel,
  exportQuoteToExcel,
  exportPurchaseOrderToExcel
} = require('@/controllers/excelController');

// Invoice 导出路由
router.route('/invoice/:id?').get(catchErrors(exportInvoiceToExcel));

// Quote 导出路由
router.route('/quote/:id?').get(catchErrors(exportQuoteToExcel));

// Purchase Order 导出路由
router.route('/purchaseorder/:id?').get(catchErrors(exportPurchaseOrderToExcel));

module.exports = router; 