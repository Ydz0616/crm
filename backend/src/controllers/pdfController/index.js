const pug = require('pug');
const fs = require('fs');
const moment = require('moment');
const path = require('path');
// Use puppeteer directly
const puppeteer = require('puppeteer');
const { listAllSettings, loadSettings } = require('@/middlewares/settings');
const { getData } = require('@/middlewares/serverData');
const useLanguage = require('@/locale/useLanguage');
const { useMoney, useDate } = require('@/settings');

const pugFiles = ['invoice', 'offer', 'quote', 'payment','purchaseorder'];

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
        } 
        // 生产环境使用完整URL
        else {
          if (serverHost) {
            if (settings.company_logo.startsWith('/')) {
              settings.company_logo = settings.company_logo.substring(1);
            }
            settings.public_server_file = serverHost.endsWith('/') ? serverHost : serverHost + '/';
          } else {
            settings.public_server_file = serverUrl;
          }
        }
      }
      
      // 添加版本号防止缓存
      if (settings.company_logo && !settings.company_logo.includes('?v=')) {
        settings.company_logo = `${settings.company_logo}?v=${Date.now()}`;
      }
      
      console.log('[PDF生成] 图片最终URL:', settings.public_server_file + settings.company_logo);

      const htmlContent = pug.renderFile('src/pdf/' + modelName + '.pug', {
        model: result,
        settings,
        translate,
        dateFormat,
        moneyFormatter,
        moment: moment,
      });

      try {
        // 使用Puppeteer直接生成PDF
        const browser = await puppeteer.launch({
          headless: 'new',
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none']
        });
        const page = await browser.newPage();
        
        // 设置中文字体
        await page.evaluateOnNewDocument(() => {
          document.documentElement.style.cssText = `
            font-family: 'Noto Sans CJK SC', 'Noto Sans CJK', sans-serif;
          `;
        });
        
        // 添加内联样式确保中文显示
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
        
        // 设置页面内容
        await page.setContent(htmlWithFonts, { waitUntil: 'networkidle0' });
        
        // 设置PDF选项
        const pdfOptions = {
          path: targetLocation,
          format: info.format,
          margin: {
            top: '10mm',
            right: '10mm',
            bottom: '10mm',
            left: '10mm'
          },
          printBackground: true
        };
        
        // 生成PDF
        await page.pdf(pdfOptions);
        
        // 关闭浏览器
        await browser.close();
        
        if (callback) callback();
      } catch (error) {
        console.error("PDF生成错误:", error);
        throw new Error(error);
      }
    }
  } catch (error) {
    console.error("PDF生成过程中出错:", error);
    throw new Error(error);
  }
};
