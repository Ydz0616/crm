const fs = require('fs').promises;
const mongoose = require('mongoose');

const FileModel = mongoose.model('File');
const JobModel = mongoose.model('Job');

const getTranscript = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(404).json({
      success: false,
      result: null,
      message: '文件不存在或无权访问',
    });
  }

  const file = await FileModel.findOne({
    _id: id,
    createdBy: req.admin._id,
    removed: false,
  });
  if (!file) {
    return res.status(404).json({
      success: false,
      result: null,
      message: '文件不存在或无权访问',
    });
  }

  if (!file.transcriptionJobId) {
    return res.status(422).json({
      success: false,
      result: null,
      message: `文件 "${file.originalName}" 无关联转写任务`,
    });
  }

  const job = await JobModel.findById(file.transcriptionJobId);
  if (!job) {
    return res.status(500).json({
      success: false,
      result: null,
      message: `文件 "${file.originalName}" 关联的转写任务记录缺失`,
    });
  }
  if (job.status === 'pending' || job.status === 'running') {
    return res.status(409).json({
      success: false,
      result: null,
      message: `文件 "${file.originalName}" 转写中`,
    });
  }
  if (job.status === 'failed') {
    return res.status(422).json({
      success: false,
      result: null,
      message: `文件 "${file.originalName}" 转写失败: ${job.error || 'unknown'}`,
    });
  }

  let transcript;
  try {
    transcript = await fs.readFile(file.sourcePath + '.txt', 'utf-8');
  } catch (err) {
    return res.status(500).json({
      success: false,
      result: null,
      message: `Sidecar transcript 读取失败 (${file.originalName}): ${err.message}`,
    });
  }

  return res.status(200).json({
    success: true,
    result: {
      fileId: file._id,
      originalName: file.originalName,
      transcript,
      sizeBytes: Buffer.byteLength(transcript, 'utf-8'),
      durationMs: job.result?.durationMs,
      jobStatus: job.status,
    },
    message: 'transcript loaded',
  });
};

module.exports = getTranscript;
