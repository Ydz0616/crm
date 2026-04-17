const pug = require('pug');
const fs = require('fs');
const moment = require('moment');
const path = require('path');
// 导入Gotenberg服务
const { generatePdfWithGotenberg } = require('./gotenbergService');
const { listAllSettings, loadSettings } = require('@/middlewares/settings');
const { getData } = require('@/middlewares/serverData');
const useLanguage = require('@/locale/useLanguage');
const { useMoney, useDate } = require('@/settings');
// 导入中文大写金额转换函数
const { numberToChineseAmount } = require('@/utils/numberToChinese');

// 所有PDF文件类型现在都使用Gotenberg
const pugFiles = ['invoice', 'offer', 'quote', 'payment', 'purchaseorder'];

require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

// Resolve the public URL prefix used by pug templates to build absolute
// asset URLs (e.g. for company logo). Dev → backend itself; prod →
// SERVER_HOST. Must return a URL ending with '/'.
const resolvePublicBase = () => {
  if (process.env.NODE_ENV === 'development') {
    return `http://localhost:${process.env.PORT || 8888}/`;
  }
  const host = process.env.SERVER_HOST;
  if (host) return host.endsWith('/') ? host : host + '/';
  return process.env.PUBLIC_SERVER_FILE || '/';
};

// 确保目录存在
const ensureDirectoryExists = (filePath) => {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  
  // 递归创建目录
  ensureDirectoryExists(dirname);
  fs.mkdirSync(dirname, { recursive: true });
};

// 新增方法：直接生成PDF流并返回，不保存文件
exports.generatePdfStream = async (
  modelName,
  info = { filename: 'pdf_file', format: 'A5' },
  result,
  callback
) => {
  try {
    // render pdf html
    if (pugFiles.includes(modelName.toLowerCase())) {
      // Compile Pug template
      const settings = await loadSettings(result.createdBy);
      const selectedLang = settings['easycrm_app_language'];
      const translate = useLanguage({ selectedLang });

      // find currency information
      const Currency = require('@/models/appModels/Currencies');
      const currencyInfo = await Currency.findOne({
        currency_code: result.currency,
        removed: false,
      });

      const {
        currency_symbol,
        currency_position,
        decimal_sep,
        thousand_sep,
        cent_precision,
        zero_format,
      } = currencyInfo ? {
        currency_symbol: currencyInfo.currency_symbol,
        currency_position: currencyInfo.currency_position,
        decimal_sep: currencyInfo.decimal_separator,
        thousand_sep: currencyInfo.thousand_separator,
        cent_precision: currencyInfo.cent_precision,
        zero_format: currencyInfo.zero_format,
      } : settings;

      const { moneyFormatter } = useMoney({
        settings: {
          currency_symbol,
          currency_position,
          decimal_sep,
          thousand_sep,
          cent_precision,
          zero_format,
        }
      });

      const { dateFormat } = useDate({ settings });

      settings.public_server_file = resolvePublicBase();

      if (modelName.toLowerCase() === 'purchaseorder' && result.total) {
        result.totalInChinese = numberToChineseAmount(result.total);
      }

      const htmlContent = pug.renderFile('src/pdf/' + modelName + '.pug', {
        model: result,
        settings,
        translate,
        dateFormat,
        moneyFormatter,
        moment: moment,
      });

      const htmlWithFonts = `
        <style>
          @font-face {
            font-family: 'Noto Sans CJK SC';
            src: local('Noto Sans CJK SC'), local('Noto Sans CJK');
          }
          * {
            font-family: 'Noto Sans CJK SC', 'Noto Sans CJK', sans-serif !important;
          }
        </style>
        ${htmlContent}
      `;

      try {
        console.log('使用Gotenberg生成PDF流: ' + modelName);
        
        // 设置PDF选项
        const pdfOptions = {
          width: 8.27, // A4宽度，单位英寸
          height: 11.7, // A4高度，单位英寸
          margin: {
            top: '10mm',
            right: '10mm',
            bottom: '10mm',
            left: '10mm'
          },
          printBackground: true,
          format: info.format
        };
        
        // 使用Gotenberg生成PDF
        const pdfBuffer = await generatePdfWithGotenberg(htmlWithFonts, pdfOptions);
        
        // 直接返回PDF缓冲区
        if (callback) callback(pdfBuffer);
      } catch (error) {
        console.error("Gotenberg PDF流生成错误:", error);
        throw new Error(`Gotenberg PDF流生成失败: ${error.message}`);
      }
    }
  } catch (error) {
    console.error("PDF流生成过程中出错:", error);
    throw new Error(error);
  }
};

// 原有方法保持不变
exports.generatePdf = async (
  modelName,
  info = { filename: 'pdf_file', format: 'A5', targetLocation: '' },
  result,
  callback
) => {
  try {
    const { targetLocation } = info;
    
    // 确保目标目录存在
    ensureDirectoryExists(targetLocation);

    // if PDF already exists, then delete it and create a new PDF
    if (fs.existsSync(targetLocation)) {
      fs.unlinkSync(targetLocation);
    }

    // render pdf html
    if (pugFiles.includes(modelName.toLowerCase())) {
      // Compile Pug template
      const settings = await loadSettings(result.createdBy);
      const selectedLang = settings['easycrm_app_language'];
      const translate = useLanguage({ selectedLang });

      // find currency information
      const Currency = require('@/models/appModels/Currencies');
      const currencyInfo = await Currency.findOne({
        currency_code: result.currency,
        removed: false,
      });

      const {
        currency_symbol,
        currency_position,
        decimal_sep,
        thousand_sep,
        cent_precision,
        zero_format,
      } = currencyInfo ? {
        currency_symbol: currencyInfo.currency_symbol,
        currency_position: currencyInfo.currency_position,
        decimal_sep: currencyInfo.decimal_separator,
        thousand_sep: currencyInfo.thousand_separator,
        cent_precision: currencyInfo.cent_precision,
        zero_format: currencyInfo.zero_format,
      } : settings;

      const { moneyFormatter } = useMoney({
        settings: {
          currency_symbol,
          currency_position,
          decimal_sep,
          thousand_sep,
          cent_precision,
          zero_format,
        }
      });

      const { dateFormat } = useDate({ settings });

      settings.public_server_file = resolvePublicBase();

      if (modelName.toLowerCase() === 'purchaseorder' && result.total) {
        result.totalInChinese = numberToChineseAmount(result.total);
      }

      const htmlContent = pug.renderFile('src/pdf/' + modelName + '.pug', {
        model: result,
        settings,
        translate,
        dateFormat,
        moneyFormatter,
        moment: moment,
      });

      const htmlWithFonts = `
        <style>
          @font-face {
            font-family: 'Noto Sans CJK SC';
            src: local('Noto Sans CJK SC'), local('Noto Sans CJK');
          }
          * {
            font-family: 'Noto Sans CJK SC', 'Noto Sans CJK', sans-serif !important;
          }
        </style>
        ${htmlContent}
      `;

      try {
        console.log('使用Gotenberg生成PDF: ' + modelName);
        
        // 设置PDF选项
        const pdfOptions = {
          width: 8.27, // A4宽度，单位英寸
          height: 11.7, // A4高度，单位英寸
          margin: {
            top: '10mm',
            right: '10mm',
            bottom: '10mm',
            left: '10mm'
          },
          printBackground: true,
          format: info.format
        };
        
        // 使用Gotenberg生成PDF
        const pdfBuffer = await generatePdfWithGotenberg(htmlWithFonts, pdfOptions);
        
        // 写入PDF文件
        fs.writeFileSync(targetLocation, pdfBuffer);
        
        if (callback) callback();
      } catch (error) {
        console.error("Gotenberg PDF生成错误:", error);
        throw new Error(`Gotenberg PDF生成失败: ${error.message}`);
      }
    }
  } catch (error) {
    console.error("PDF生成过程中出错:", error);
    throw new Error(error);
  }
};
