const ExcelJS = require('exceljs');

/**
 * 生成 Excel 文件
 * @param {Object} data - 需要导出的数据
 * @param {Object} options - Excel 配置选项
 * @returns {Promise<Buffer>} - Excel 文件缓冲区
 */
const generateExcel = async (data, options = {}) => {
  try {
    console.log('开始生成 Excel 文件');
    
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'EASYCRM';
    workbook.lastModifiedBy = 'EASYCRM Excel Service';
    workbook.created = new Date();
    workbook.modified = new Date();
    
    const sheetName = options.sheetName || 'Sheet1';
    const worksheet = workbook.addWorksheet(sheetName, {
      pageSetup: { 
        paperSize: 9, 
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0
      }
    });
    
    // 设置列定义
    if (options.columnDefinitions) {
      worksheet.columns = options.columnDefinitions;
    }
    
    let currentRow = 1;
    
    // 1. 文档标题 (Invoice/Quote/PO)
    if (options.documentHeader) {
      const titleRow = worksheet.addRow([options.documentHeader.title]);
      currentRow++;
      titleRow.height = 30;
      const titleCell = titleRow.getCell(1);
      titleCell.font = { 
        bold: true, 
        size: 16, 
        color: { argb: '52008c' } 
      };
      titleCell.alignment = { 
        vertical: 'middle', 
        horizontal: options.documentHeader.alignment || 'left' 
      };
      // 添加文档编号和日期
      if (options.documentHeader.details) {
        options.documentHeader.details.forEach(detail => {
          const detailRow = worksheet.addRow([detail]);
          currentRow++;
          detailRow.height = 20;
          const detailCell = detailRow.getCell(1);
          detailCell.font = { bold: true };
          detailCell.alignment = { 
            vertical: 'middle', 
            horizontal: options.documentHeader.alignment || 'left' 
          };
        });
      }
      worksheet.addRow([]);
      currentRow++;
    }
    
    // 2. 公司信息和Bill To严格分行（不再包含Be A Responsible Company）
    if (options.companyInfo || options.clientInfo) {
      const companyInfoArr = [
        options.companyInfo?.company || '',
        options.companyInfo?.address || '',
        options.companyInfo?.phone || '',
        options.companyInfo?.email || ''
      ];
      const clientInfoArr = [
        '', // 第一行Bill To
        options.clientInfo?.name || '',
        options.clientInfo?.address || '',
        options.clientInfo?.phone || '',
        options.clientInfo?.email || ''
      ];
      // 第一行：公司名 | Bill To
      const row1 = worksheet.addRow([
        companyInfoArr[0], '', '', 'Bill To', ''
      ]);
      row1.getCell(1).font = { bold: true };
      row1.getCell(4).font = { bold: true };
      currentRow++;
      // 其余行：公司信息 | 客户信息
      for (let i = 1; i < companyInfoArr.length; i++) {
        worksheet.addRow([
          companyInfoArr[i] || '', '', '', clientInfoArr[i] || ''
        ]);
        currentRow++;
      }
      worksheet.addRow([]);
      currentRow++;
    }
    
    // 只在商品区块前插入表头
    let insertedHeader = false;
    if (options.headers && Array.isArray(data) && data.length > 0) {
      const headerRow = worksheet.addRow(options.headers);
      currentRow++;
      headerRow.font = { bold: true };
      headerRow.height = 25;
      headerRow.eachCell((cell, colNumber) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.font = { bold: true, color: { argb: '52008c' } };
      });
      insertedHeader = true;
    }
    
    // 添加数据行
    let lastDataRowIndex = currentRow;
    if (Array.isArray(data)) {
      data.forEach((row, rowIndex) => {
        const excelRow = worksheet.addRow(row);
        currentRow++;
        lastDataRowIndex = currentRow;
        excelRow.height = 22;
        // 金额列和Total Amount列居中
        if (options.numberFormatCols) {
          options.numberFormatCols.forEach(col => {
            if (row[col-1] !== '') {
              const cell = excelRow.getCell(col);
              cell.numFmt = '#,##0.00';
              cell.alignment = { vertical: 'middle', horizontal: 'center' };
            }
          });
        }
        excelRow.eachCell((cell, colNumber) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
          // 其余列默认居中
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });
      });
    }
    
    // 添加合计行
    if (options.summary && lastDataRowIndex > 0) {
      const summaryStartCol = options.summaryStartCol || options.headers.length - 1;
      const valueCol = options.summaryValueCol || options.headers.length;
      options.summary.forEach(summaryItem => {
        const { label, value } = summaryItem;
        const summaryRow = worksheet.addRow([]);
        currentRow++;
        const labelCell = summaryRow.getCell(summaryStartCol);
        const valueCell = summaryRow.getCell(valueCol);
        labelCell.value = label;
        labelCell.alignment = { vertical: 'middle', horizontal: 'right' };
        valueCell.value = value;
        valueCell.numFmt = '#,##0.00';
        valueCell.alignment = { vertical: 'middle', horizontal: 'center' };
        if (summaryItem.isTotal) {
          labelCell.font = { bold: true };
          valueCell.font = { bold: true };
          summaryRow.height = 24;
        }
        labelCell.border = {
          top: { style: summaryItem.isTotal ? 'medium' : 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        valueCell.border = {
          top: { style: summaryItem.isTotal ? 'medium' : 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
      worksheet.addRow([]);
      currentRow++;
    }
    
    // footerText始终在最后一行，横向合并到最大列
    if (options.footerText) {
      const maxCol = worksheet.columnCount;
      const footerRow = worksheet.addRow([options.footerText]);
      currentRow++;
      worksheet.mergeCells(`A${currentRow}:${String.fromCharCode(64+maxCol)}${currentRow}`);
      const footerCell = footerRow.getCell(1);
      footerCell.font = { bold: true, italic: true };
      footerCell.alignment = { vertical: 'middle', horizontal: 'center' };
    }
    
    // 调整列宽
    if (options.columnDefinitions) {
      // 已经在列定义中设置了宽度，不需要再自动调整
    } else {
      worksheet.columns.forEach(column => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, cell => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = Math.min(maxLength + 2, 30); // 设置最大宽度为 30
      });
    }
    
    // 生成 Excel 文件
    return await workbook.xlsx.writeBuffer();
  } catch (error) {
    console.error('Excel 生成错误:', error);
    throw new Error(`Excel 生成失败: ${error.message}`);
  }
};

module.exports = {
  generateExcel
}; 