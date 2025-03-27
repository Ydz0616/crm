const pug = require('pug');
const fs = require('fs');
const moment = require('moment');
const path = require('path');
let pdf = require('html-pdf');
const { listAllSettings, loadSettings } = require('@/middlewares/settings');
const { getData } = require('@/middlewares/serverData');
const useLanguage = require('@/locale/useLanguage');
const { useMoney, useDate } = require('@/settings');

const pugFiles = ['invoice', 'offer', 'quote', 'payment','purchaseorder'];

require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

// 智能检测PhantomJS路径
function getPhantomJsPath() {
  // 先检查是否在Docker容器中
  if (fs.existsSync('/.dockerenv') || 
      (fs.existsSync('/proc/1/cgroup') && 
       fs.readFileSync('/proc/1/cgroup', 'utf8').includes('docker'))) {
    // Docker容器内的PhantomJS位置
    if (fs.existsSync('/usr/bin/phantomjs')) {
      return '/usr/bin/phantomjs';
    }
    if (fs.existsSync('/usr/local/bin/phantomjs')) {
      return '/usr/local/bin/phantomjs';
    }
  }
  
  // 尝试使用npm安装的PhantomJS
  try {
    const phantomjs = require('phantomjs-prebuilt');
    if (phantomjs && phantomjs.path) {
      return phantomjs.path;
    }
  } catch (err) {
    console.log('Failed to find phantomjs-prebuilt module:', err.message);
  }
  
  // 如果都找不到，返回null让html-pdf库自己处理
  return null;
}

exports.generatePdf = async (
  modelName,
  info = { filename: 'pdf_file', format: 'A5', targetLocation: '' },
  result,
  callback
) => {
  try {
    const { targetLocation } = info;

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

      settings.public_server_file = process.env.PUBLIC_SERVER_FILE;

      const htmlContent = pug.renderFile('src/pdf/' + modelName + '.pug', {
        model: result,
        settings,
        translate,
        dateFormat,
        moneyFormatter,
        moment: moment,
      });

      // 配置PDF选项
      const pdfOptions = {
        format: info.format,
        orientation: 'portrait',
        border: '10mm',
      };
      
      // 智能检测PhantomJS路径并添加到选项中
      const phantomPath = getPhantomJsPath();
      if (phantomPath) {
        console.log(`Using PhantomJS from: ${phantomPath}`);
        pdfOptions.phantomPath = phantomPath;
      }

      pdf
        .create(htmlContent, pdfOptions)
        .toFile(targetLocation, function (error) {
          if (error) {
            console.error("PDF生成错误:", error);
            throw new Error(error);
          }
          if (callback) callback();
        });
    }
  } catch (error) {
    console.error("PDF生成过程中出错:", error);
    throw new Error(error);
  }
};
