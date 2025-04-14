const express = require('express');
const { catchErrors } = require('@/handlers/errorHandlers');
const router = express.Router();
const adminController = require('@/controllers/coreControllers/adminController');
const settingController = require('@/controllers/coreControllers/settingController');
const { singleStorageUpload } = require('@/middlewares/uploadMiddleware');
const path = require('path');
const fs = require('fs');

// 添加一个直接的调试端点，不使用认证中间件
router.route('/setting/upload_logo').patch((req, res) => {
  console.log('接收到logo上传请求:');
  console.log('Body:', req.body);
  console.log('Files:', req.files ? Object.keys(req.files) : 'No files');
  
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({
        success: false,
        message: '没有找到上传文件'
      });
    }
    
    const file = req.files.file;
    console.log('文件详情:', {
      name: file.name,
      size: file.size,
      mimetype: file.mimetype
    });
    
    // 基本文件路径处理
    const uploadDir = `src/public/uploads/setting`;
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // 清理临时文件
    try {
      const files = fs.readdirSync(uploadDir);
      files.forEach(f => {
        if (f.startsWith('company-logo-') && f !== 'company-logo.png') {
          console.log(`清理临时logo文件: ${f}`);
          fs.unlinkSync(path.join(uploadDir, f));
        }
      });
    } catch (err) {
      console.warn('清理临时文件时出错:', err);
      // 继续处理，不中断上传流程
    }
    
    // 使用固定文件名覆盖原有文件
    const fileName = `company-logo.png`;
    const filePath = path.join(uploadDir, fileName);
    
    // 保存文件
    file.mv(filePath, async (err) => {
      if (err) {
        console.error('文件保存错误:', err);
        return res.status(500).json({
          success: false,
          message: '文件保存失败: ' + err.message
        });
      }
      
      // 更新数据库中的设置
      const mongoose = require('mongoose');
      const Setting = mongoose.model('Setting');
      
      const publicPath = `public/uploads/setting/${fileName}`;
      const result = await Setting.findOneAndUpdate(
        { settingKey: 'company_logo' },
        { settingValue: publicPath },
        { new: true }
      );
      
      if (!result) {
        return res.status(404).json({
          success: false,
          message: '未找到company_logo设置'
        });
      }
      
      return res.status(200).json({
        success: true,
        result,
        message: '公司logo更新成功'
      });
    });
    
  } catch (error) {
    console.error('上传处理错误:', error);
    return res.status(500).json({
      success: false,
      message: '上传处理错误: ' + error.message
    });
  }
});

// 添加清理临时logo文件的路由
router.route('/setting/cleanup_temp_files').get((req, res) => {
  try {
    console.log('开始清理临时文件...');
    const uploadDir = `src/public/uploads/setting`;
    
    if (!fs.existsSync(uploadDir)) {
      return res.status(200).json({
        success: true,
        message: '没有找到上传目录，无需清理'
      });
    }
    
    const files = fs.readdirSync(uploadDir);
    let deletedCount = 0;
    
    files.forEach(f => {
      if (f.startsWith('company-logo-') && f !== 'company-logo.png') {
        console.log(`删除临时文件: ${f}`);
        fs.unlinkSync(path.join(uploadDir, f));
        deletedCount++;
      }
    });
    
    return res.status(200).json({
      success: true,
      message: `成功清理 ${deletedCount} 个临时文件`
    });
  } catch (error) {
    console.error('清理文件时出错:', error);
    return res.status(500).json({
      success: false,
      message: '清理文件时出错: ' + error.message
    });
  }
});

// //_______________________________ Admin management_______________________________

router.route('/admin/read/:id').get(catchErrors(adminController.read));

router.route('/admin/password-update/:id').patch(catchErrors(adminController.updatePassword));

//_______________________________ Admin Profile _______________________________

router.route('/admin/profile/password').patch(catchErrors(adminController.updateProfilePassword));
router
  .route('/admin/profile/update')
  .patch(
    singleStorageUpload({ entity: 'admin', fieldName: 'photo', fileType: 'image' }),
    catchErrors(adminController.updateProfile)
  );

// //____________________________________________ API for Global Setting _________________

router.route('/setting/create').post(catchErrors(settingController.create));
router.route('/setting/read/:id').get(catchErrors(settingController.read));
router.route('/setting/update/:id').patch(catchErrors(settingController.update));
//router.route('/setting/delete/:id).delete(catchErrors(settingController.delete));
router.route('/setting/search').get(catchErrors(settingController.search));
router.route('/setting/list').get(catchErrors(settingController.list));
router.route('/setting/listAll').get(catchErrors(settingController.listAll));
router.route('/setting/filter').get(catchErrors(settingController.filter));
router
  .route('/setting/readBySettingKey/:settingKey')
  .get(catchErrors(settingController.readBySettingKey));
router.route('/setting/listBySettingKey').get(catchErrors(settingController.listBySettingKey));
router
  .route('/setting/updateBySettingKey/:settingKey?')
  .patch(catchErrors(settingController.updateBySettingKey));
router
  .route('/setting/upload/:settingKey?')
  .patch(
    catchErrors(
      singleStorageUpload({ entity: 'setting', fieldName: 'settingValue', fileType: 'image' })
    ),
    catchErrors(settingController.updateBySettingKey)
  );
router.route('/setting/updateManySetting').patch(catchErrors(settingController.updateManySetting));
module.exports = router;
