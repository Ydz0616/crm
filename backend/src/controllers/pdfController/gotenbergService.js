const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const os = require('os');

// 从环境变量中获取Gotenberg服务URL，默认为本地开发环境URL
const GOTENBERG_URL = process.env.GOTENBERG_URL || 'http://localhost:3000';

/**
 * Gotenberg PDF生成服务
 * 使用Gotenberg服务将HTML转换为PDF
 */
const generatePdfWithGotenberg = async (htmlContent, options = {}) => {
  try {
    // 处理HTML中的图片，转换为base64内联格式
    const processedHtml = await processImagesInHtml(htmlContent);
    
    // 生成临时HTML文件
    const tempDir = os.tmpdir();
    const tempHtmlPath = path.join(tempDir, `temp-${Date.now()}.html`);
    
    // 写入HTML内容到临时文件
    fs.writeFileSync(tempHtmlPath, processedHtml, 'utf8');
    
    // 创建FormData
    const form = new FormData();
    form.append('files', fs.createReadStream(tempHtmlPath), {
      filename: 'index.html',
      contentType: 'text/html; charset=UTF-8',
    });
    
    // 添加PDF配置 - Gotenberg 8使用不同的参数名称
    const pdfConfig = {
      margin: {
        top: options.margin?.top || '0.4in',
        bottom: options.margin?.bottom || '0.4in',
        left: options.margin?.left || '0.4in',
        right: options.margin?.right || '0.4in',
      },
      printBackground: options.printBackground || true,
      landscape: options.landscape || false,
      scale: options.scale || 1.0,
      waitTimeout: '30s', // 增加等待时间，确保图片加载完成
    };
    
    // 添加配置到FormData - Gotenberg 8使用JSON格式的metadata
    form.append('metadata', JSON.stringify({
      pdfFormat: {
        ...pdfConfig
      }
    }));
    
    // Gotenberg 8的新API路径
    const apiEndpoint = `${GOTENBERG_URL}/forms/chromium/convert/html`;
    console.log(`发送请求到Gotenberg服务: ${apiEndpoint}`);
    
    // 发送请求到Gotenberg服务
    const response = await axios.post(apiEndpoint, form, {
      headers: {
        ...form.getHeaders(),
      },
      responseType: 'arraybuffer',
    });
    
    // 清理临时文件
    fs.unlinkSync(tempHtmlPath);
    
    // 返回PDF数据
    return response.data;
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
        console.log('图片已经是base64，跳过处理:', imgSrc);
        continue;
      }
      
      // 即使是外部URL，在Gotenberg中我们也需要将其转换为base64
      // 移除这个检查以确保所有图片都转为base64
      // if (imgSrc.startsWith('http')) {
      //   console.log('跳过外部URL图片:', imgSrc);
      //   continue;
      // }
      
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
    
    // 如果是远程URL，优先使用远程URL而不是尝试找本地文件
    if (imgPath.startsWith('http')) {
      try {
        console.log('处理远程URL图片:', imgPath);
        const response = await axios.get(imgPath, { responseType: 'arraybuffer' });
        const contentType = response.headers['content-type'] || 'image/png';
        const base64 = Buffer.from(response.data, 'binary').toString('base64');
        return `data:${contentType};base64,${base64}`;
      } catch (error) {
        console.error('获取远程图片失败:', error.message);
        // 如果远程获取失败，继续尝试本地文件
        console.log('远程获取失败，尝试查找本地文件');
      }
    }
    
    // 特别处理公司logo路径
    const logoFilename = 'company-logo.png';
    if (imgPath.includes(logoFilename) || imgPath.includes('company_logo')) {
      const projectRoot = process.cwd();
      const logoPath = path.join(projectRoot, 'src/public/uploads/setting/company-logo.png');
      
      console.log('检测到logo图片路径，使用固定路径:', logoPath);
      
      if (fs.existsSync(logoPath)) {
        console.log('成功找到logo文件');
        const imageBuffer = fs.readFileSync(logoPath);
        return `data:image/png;base64,${imageBuffer.toString('base64')}`;
      } else {
        console.error('找不到logo文件:', logoPath);
      }
    }
    
    // 处理常规图片路径
    let resolvedPath = '';
    
    // 尝试不同的路径组合
    const pathsToTry = [
      imgPath,                                // 原始路径
      path.join(process.cwd(), imgPath),      // 从项目根目录
      path.join(process.cwd(), 'src', imgPath), // 从src目录
      // 移除开头的斜杠
      ...(imgPath.startsWith('/') 
        ? [
            path.join(process.cwd(), imgPath.substring(1)),
            path.join(process.cwd(), 'src', imgPath.substring(1))
          ] 
        : []
      )
    ];
    
    // 尝试所有可能的路径
    for (const pathToTry of pathsToTry) {
      console.log('尝试读取图片:', pathToTry);
      if (fs.existsSync(pathToTry)) {
        resolvedPath = pathToTry;
        console.log('成功找到图片:', resolvedPath);
        break;
      }
    }
    
    // 如果找到了图片，转换为base64
    if (resolvedPath) {
      try {
        const fileBuffer = fs.readFileSync(resolvedPath);
        const fileExtension = path.extname(resolvedPath).substring(1).toLowerCase();
        let mimeType = 'image/png'; // 默认MIME类型
        
        // 根据文件扩展名确定MIME类型
        switch (fileExtension) {
          case 'jpg':
          case 'jpeg':
            mimeType = 'image/jpeg';
            break;
          case 'png':
            mimeType = 'image/png';
            break;
          case 'gif':
            mimeType = 'image/gif';
            break;
          case 'svg':
            mimeType = 'image/svg+xml';
            break;
          // 可以添加更多类型
        }
        
        return `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
      } catch (error) {
        console.error('读取本地图片文件失败:', error);
        return null;
      }
    } else {
      console.error('无法解析图片路径:', imgPath);
      return null;
    }
  } catch (error) {
    console.error('转换图片为base64时出错:', error);
    return null;
  }
};

module.exports = {
  generatePdfWithGotenberg,
}; 