const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const os = require('os');

// 从环境变量中获取Gotenberg服务URL，使用Kubernetes service discovery
const GOTENBERG_URL = process.env.GOTENBERG_URL || 'http://gotenberg.default.svc.cluster.local:3000';

// 输出Gotenberg API配置信息
console.log('=== GOTENBERG配置信息 ===');
console.log(`GOTENBERG_URL: ${GOTENBERG_URL}`);
console.log('======================');

/**
 * Gotenberg PDF生成服务
 * 使用Gotenberg服务将HTML转换为PDF
 */
const generatePdfWithGotenberg = async (htmlContent, options = {}) => {
  try {
    // 输出调试信息
    console.log('开始PDF生成过程');
    console.log('Gotenberg URL:', GOTENBERG_URL);
    
    // 处理HTML中的图片，转换为base64内联格式
    const processedHtml = await processImagesInHtml(htmlContent);
    
    // 生成临时HTML文件
    const tempDir = os.tmpdir();
    const tempHtmlPath = path.join(tempDir, `temp-${Date.now()}.html`);
    
    // 写入HTML内容到临时文件
    fs.writeFileSync(tempHtmlPath, processedHtml, 'utf8');
    console.log(`HTML文件已写入: ${tempHtmlPath}`);
    
    // 创建FormData
    const form = new FormData();
    form.append('files', fs.createReadStream(tempHtmlPath), {
      filename: 'index.html',
      contentType: 'text/html; charset=UTF-8',
    });
    
    // 添加PDF配置 - 使用Gotenberg 8兼容的格式
    // 以下将各个参数作为独立字段添加，而不是使用嵌套的metadata JSON
    form.append('marginTop', options.margin?.top || '0.4in');
    form.append('marginBottom', options.margin?.bottom || '0.4in');
    form.append('marginLeft', options.margin?.left || '0.4in');
    form.append('marginRight', options.margin?.right || '0.4in');
    form.append('printBackground', String(options.printBackground !== false));
    form.append('landscape', String(options.landscape === true));
    form.append('scale', String(options.scale || 1.0));
    form.append('waitTimeout', '30s');
    
    // 使用主要API路径，根据Gotenberg 8.x版本的标准
    const apiEndpoint = `${GOTENBERG_URL}/forms/chromium/convert/html`;
    console.log(`使用Gotenberg API: ${apiEndpoint}`);
    
    try {
      // 发送请求到Gotenberg服务
      const response = await axios.post(apiEndpoint, form, {
        headers: {
          ...form.getHeaders(),
        },
        responseType: 'arraybuffer',
        timeout: 30000, // 30秒超时
      });
      
      // 如果成功，记录状态
      console.log(`成功使用API端点: ${apiEndpoint}`);
      console.log(`响应状态: ${response.status}`);
      
      // 清理临时文件
      fs.unlinkSync(tempHtmlPath);
      
      // 返回PDF数据
      return response.data;
    } catch (err) {
      console.error(`API端点 ${apiEndpoint} 失败:`, err.message);
      
      // 尝试备用路径 - Gotenberg 7.x版本
      const fallbackEndpoint = `${GOTENBERG_URL}/chrome/convert/html`;
      console.log(`尝试备用API端点: ${fallbackEndpoint}`);
      
      try {
        const response = await axios.post(fallbackEndpoint, form, {
          headers: {
            ...form.getHeaders(),
          },
          responseType: 'arraybuffer',
          timeout: 30000, // 30秒超时
        });
        
        console.log(`成功使用备用API端点: ${fallbackEndpoint}`);
        console.log(`响应状态: ${response.status}`);
        
        // 清理临时文件
        fs.unlinkSync(tempHtmlPath);
        
        // 返回PDF数据
        return response.data;
      } catch (fallbackErr) {
        console.error(`备用API端点 ${fallbackEndpoint} 也失败:`, fallbackErr.message);
        throw new Error(`所有Gotenberg API端点均失败: ${fallbackErr.message}`);
      }
    }
  } catch (error) {
    console.error('Gotenberg PDF生成错误:', error);
    throw new Error(`Gotenberg PDF生成失败: ${error.message}`);
  }
};

/**
 * 处理HTML中的图片，将外部图片转换为base64嵌入格式
 * @param {string} htmlContent - 原始HTML内容
 * @returns {string} - 处理后的HTML内容
 */
const processImagesInHtml = async (htmlContent) => {
  try {
    // 查找所有图片标签
    const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;
    let match;
    let processedHtml = htmlContent;
    
    const replacePromises = [];
    const matches = [];
    
    console.log('开始处理HTML中的图片...');
    // 收集所有匹配项和替换promises
    while ((match = imgRegex.exec(htmlContent)) !== null) {
      const fullImgTag = match[0]; // 完整的img标签
      const imgSrc = match[1]; // 图片src属性值
      
      console.log('找到图片:', imgSrc);
      
      // 如果已经是base64格式，跳过处理
      if (imgSrc.startsWith('data:')) {
        console.log('图片已经是base64，跳过处理');
        continue;
      }
      
      matches.push({
        fullImgTag,
        imgSrc
      });
      
      // 添加转换Promise
      replacePromises.push(
        convertImageToBase64(imgSrc)
          .then(base64Data => ({ imgSrc, base64Data }))
          .catch(err => {
            console.error(`处理图片出错 ${imgSrc}:`, err);
            return { imgSrc, base64Data: null };
          })
      );
    }
    
    // 等待所有替换操作完成
    const results = await Promise.all(replacePromises);
    
    // 应用替换
    for (let i = 0; i < results.length; i++) {
      const { imgSrc, base64Data } = results[i];
      if (base64Data) {
        console.log(`成功转换图片: ${imgSrc} -> base64`);
        const imgTag = matches[i].fullImgTag;
        const newImgTag = imgTag.replace(imgSrc, base64Data);
        processedHtml = processedHtml.replace(imgTag, newImgTag);
      } else {
        console.log(`无法转换图片: ${imgSrc}`);
      }
    }
    
    return processedHtml;
  } catch (error) {
    console.error('处理HTML中的图片出错:', error);
    return htmlContent; // 发生错误时返回原始HTML
  }
};

/**
 * 将图片转换为base64格式
 * @param {string} imgPath - 图片路径
 * @returns {Promise<string>} - base64格式的图片数据
 */
const convertImageToBase64 = async (imgPath) => {
  try {
    console.log('准备转换图片:', imgPath);

    // 如果是远程URL，尝试下载
    if (imgPath.startsWith('http')) {
      try {
        console.log('下载远程图片:', imgPath);
        const response = await axios.get(imgPath, { 
          responseType: 'arraybuffer',
          timeout: 5000 // 5秒超时
        });
        const contentType = response.headers['content-type'] || 'image/png';
        const base64 = Buffer.from(response.data, 'binary').toString('base64');
        console.log('成功下载远程图片');
        return `data:${contentType};base64,${base64}`;
      } catch (error) {
        console.error('下载远程图片失败:', error.message);
        return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
      }
    }
    
    // 处理本地文件路径
    try {
      // 尝试直接读取路径
      if (fs.existsSync(imgPath)) {
        console.log('找到图片文件:', imgPath);
        const imageBuffer = fs.readFileSync(imgPath);
        const ext = path.extname(imgPath).substring(1).toLowerCase();
        const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
        return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
      }
      
      // 尝试其他可能的路径
      const pathsToTry = [
        path.join(process.cwd(), imgPath),
        path.join('/usr/src/app', imgPath),
        path.join('/usr/src/app/backend', imgPath)
      ];
      
      for (const p of pathsToTry) {
        console.log('尝试路径:', p);
        if (fs.existsSync(p)) {
          console.log('找到图片文件:', p);
          const imageBuffer = fs.readFileSync(p);
          const ext = path.extname(p).substring(1).toLowerCase();
          const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
          return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
        }
      }
      
      console.log('未能找到图片文件，使用默认的1x1透明像素');
      return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    } catch (error) {
      console.error('读取图片文件出错:', error.message);
      return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    }
  } catch (error) {
    console.error('转换图片到base64出错:', error);
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  }
};

module.exports = {
  generatePdfWithGotenberg,
}; 