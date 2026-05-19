const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const mongoose = require('mongoose');

const { uploadSchema, MAX_FILE_SIZE } = require('./schemaValidate');

const FileModel = mongoose.model('File');

const UPLOADS_DIR =
  process.env.UPLOADS_DIR || path.resolve(__dirname, '../../../../uploads');

const multerHandler = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
}).single('file');

function parseMultipart(req, res) {
  return new Promise((resolve, reject) => {
    multerHandler(req, res, (err) => (err ? reject(err) : resolve()));
  });
}

function safeExt(originalname) {
  const ext = path.extname(originalname).toLowerCase();
  if (!/^\.[a-z0-9]{1,8}$/.test(ext)) return '';
  return ext;
}

const upload = async (req, res) => {
  try {
    await parseMultipart(req, res);
  } catch (err) {
    if (err && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        result: null,
        message: `文件超过 ${MAX_FILE_SIZE / 1024 / 1024}MB 上限`,
      });
    }
    return res.status(400).json({
      success: false,
      result: null,
      message: `上传解析失败: ${err && err.message ? err.message : 'unknown'}`,
    });
  }

  if (!req.file) {
    return res.status(400).json({
      success: false,
      result: null,
      message: '缺少 file 字段 (multipart/form-data，单文件 field name 必须为 file)',
    });
  }

  const { error } = uploadSchema.validate({
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
  });
  if (error) {
    const status = error.details.some((d) => d.path.includes('mimetype')) ? 415 : 400;
    return res.status(status).json({
      success: false,
      result: null,
      message: error.details.map((d) => d.message).join('; '),
    });
  }

  const adminId = req.admin._id.toString();
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const ext = safeExt(req.file.originalname);
  const uniqueName = `${uuidv4()}${ext}`;
  const targetDir = path.join(UPLOADS_DIR, adminId, yyyy, mm);
  const sourcePath = path.join(targetDir, uniqueName);

  try {
    await fs.mkdir(targetDir, { recursive: true });
    await fs.writeFile(sourcePath, req.file.buffer);
  } catch (err) {
    return res.status(500).json({
      success: false,
      result: null,
      message: `文件落盘失败: ${err.message}`,
    });
  }

  const fileDoc = await FileModel.create({
    createdBy: req.admin._id,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    sizeBytes: req.file.size,
    sourcePath,
  });

  return res.status(200).json({
    success: true,
    result: {
      _id: fileDoc._id,
      originalName: fileDoc.originalName,
      sizeBytes: fileDoc.sizeBytes,
      mimeType: fileDoc.mimeType,
    },
    message: '上传成功',
  });
};

module.exports = upload;
module.exports.UPLOADS_DIR = UPLOADS_DIR;
