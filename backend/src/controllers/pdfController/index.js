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

// 所有PDF文件类型现在都使用Gotenberg
const pugFiles = ['invoice', 'offer', 'quote', 'payment', 'purchaseorder'];

require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

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
      const settings = await loadSettings();
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

      // 确保公司logo路径是有效的
      const serverUrl = process.env.PUBLIC_SERVER_FILE || '/';
      
      // 获取服务器域名和端口
      const serverHost = process.env.SERVER_HOST || '';
      
      // 确保使用最新的logo文件
      if (settings.company_logo) {
        // 如果路径包含company-logo-时间戳的格式，替换为固定名称
        if (settings.company_logo.includes('company-logo-')) {
          settings.company_logo = 'public/uploads/setting/company-logo.png';
        }
      }
      
      console.log('[PDF生成]', {
        serverUrl,
        serverHost,
        company_logo: settings.company_logo,
        NODE_ENV: process.env.NODE_ENV 
      });
      
      // 处理公司logo路径
      if (settings.company_logo && !settings.company_logo.startsWith('http')) {
        // 本地开发使用相对路径
        if (process.env.NODE_ENV === 'development') {
          settings.public_server_file = serverUrl;
          console.log('[PDF生成] 开发环境图片路径设置:', {
            public_server_file: settings.public_server_file,
            company_logo: settings.company_logo,
            fullPath: settings.public_server_file + settings.company_logo
          });
        } 
        // 生产环境使用完整URL
        else {
          if (serverHost) {
            if (settings.company_logo.startsWith('/')) {
              settings.company_logo = settings.company_logo.substring(1);
            }
            settings.public_server_file = serverHost.endsWith('/') ? serverHost : serverHost + '/';
            console.log('[PDF生成] 生产环境图片路径设置:', {
              public_server_file: settings.public_server_file,
              company_logo: settings.company_logo,
              fullPath: settings.public_server_file + settings.company_logo
            });
          } else {
            settings.public_server_file = serverUrl;
            console.log('[PDF生成] 默认环境图片路径设置:', {
              public_server_file: settings.public_server_file,
              company_logo: settings.company_logo,
              fullPath: settings.public_server_file + settings.company_logo
            });
          }
        }
      }
      
      // 添加版本号防止缓存
      if (settings.company_logo && !settings.company_logo.includes('?v=')) {
        settings.company_logo = `${settings.company_logo}?v=${Date.now()}`;
      }
      
      console.log('[PDF生成] 图片最终URL:', settings.public_server_file + settings.company_logo);

      // Gotenberg优化: 处理logo路径
      if (settings.company_logo && !settings.company_logo.startsWith('http')) {
        // 使用已知的固定路径，同时记录原始路径
        const fixedLogoPath = path.join(process.cwd(), 'backend/src/public/uploads/setting/company-logo.png');
        console.log('[PDF生成] 为Gotenberg优化: 使用绝对logo路径', fixedLogoPath);
        
        // 保存原始路径以备后用
        settings.original_logo = settings.company_logo;
        
        // 检查文件是否存在
        if (fs.existsSync(fixedLogoPath)) {
          console.log('[PDF生成] 找到logo文件:', fixedLogoPath);
          
          // 在这里我们设置为相对路径，让processImagesInHtml函数处理成base64
          settings.company_logo = 'public/uploads/setting/company-logo.png';
        } else {
          console.warn('[PDF生成] 找不到logo文件:', fixedLogoPath);
        }
      }

      const htmlContent = pug.renderFile('src/pdf/' + modelName + '.pug', {
        model: result,
        settings,
        translate,
        dateFormat,
        moneyFormatter,
        moment: moment,
      });

      // 添加内联样式确保中文显示，同时确保logo路径包含完整路径
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
        ${htmlContent.replace(
          new RegExp(`src="${settings.public_server_file}${settings.company_logo}"`, 'g'),
          `src="${settings.company_logo}"`
        )}
      `;

      console.log('[PDF生成] 处理后的图片路径:', 
        htmlWithFonts.includes(settings.company_logo) ? 
        '找到logo路径' : '未找到logo路径');

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
