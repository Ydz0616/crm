const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const { execFile } = require('child_process');
const { promisify } = require('util');
const FormData = require('form-data');
const axios = require('axios');
const mongoose = require('mongoose');

const execFileAsync = promisify(execFile);

const COMPRESSIBLE_EXTS = new Set(['.wav', '.flac', '.aiff', '.aac', '.m4a']);
const SIZE_THRESHOLD_BYTES = 20 * 1024 * 1024;
const OPENAI_URL = 'https://api.openai.com/v1/audio/transcriptions';
const MODEL = 'gpt-4o-transcribe-diarize';
const RESPONSE_FORMAT = 'diarized_json';

function needsCompression(file) {
  const ext = path.extname(file.sourcePath).toLowerCase();
  return file.sizeBytes > SIZE_THRESHOLD_BYTES || COMPRESSIBLE_EXTS.has(ext);
}

async function compressToMp3(srcPath) {
  const dstPath = srcPath + '.compressed.mp3';
  await execFileAsync('ffmpeg', [
    '-i', srcPath, '-ac', '1', '-ar', '16000', '-b:a', '64k', '-y', dstPath,
  ]);
  return dstPath;
}

// Mirrors nanobot providers/transcription.py _format_diarized so the sidecar
// .txt shape stays consistent across CRM-direct and channel-driven paths.
function formatDiarizedJson(payload) {
  const segments = payload && Array.isArray(payload.segments) ? payload.segments : null;
  if (!segments || segments.length === 0) {
    return (payload && payload.text) || '';
  }
  return segments
    .map((seg) => {
      const speaker = seg.speaker || '?';
      const start = Number(seg.start) || 0;
      const text = (seg.text || '').trim();
      const mm = String(Math.floor(start / 60)).padStart(2, '0');
      const ss = String(Math.floor(start % 60)).padStart(2, '0');
      return `${speaker} ${mm}:${ss}  ${text}`;
    })
    .join('\n');
}

async function callOpenAI(audioPath) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');
  const formData = new FormData();
  formData.append('file', fsSync.createReadStream(audioPath));
  formData.append('model', MODEL);
  formData.append('response_format', RESPONSE_FORMAT);
  formData.append('chunking_strategy', 'auto');
  const response = await axios.post(OPENAI_URL, formData, {
    headers: { ...formData.getHeaders(), Authorization: `Bearer ${apiKey}` },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    timeout: parseInt(process.env.OPENAI_TRANSCRIPTION_TIMEOUT_MS, 10) || 600000,
  });
  return response.data;
}

async function transcribeWithOpenAI(fileDoc, jobDoc) {
  const Job = mongoose.model('Job');
  const startTs = Date.now();
  let compressedPath = null;
  try {
    await Job.findByIdAndUpdate(jobDoc._id, { status: 'running', updated: Date.now() });

    const audioPath = needsCompression(fileDoc)
      ? (compressedPath = await compressToMp3(fileDoc.sourcePath))
      : fileDoc.sourcePath;

    const payload = await callOpenAI(audioPath);
    const transcript = formatDiarizedJson(payload);
    if (!transcript || transcript.trim() === '') {
      throw new Error('OpenAI returned empty transcript');
    }

    const sidecarPath = fileDoc.sourcePath + '.txt';
    await fs.writeFile(sidecarPath, transcript, 'utf-8');

    await Job.findByIdAndUpdate(jobDoc._id, {
      status: 'done',
      result: {
        sidecarPath,
        sizeBytes: Buffer.byteLength(transcript, 'utf-8'),
        durationMs: Date.now() - startTs,
      },
      updated: Date.now(),
    });
  } catch (err) {
    await Job.findByIdAndUpdate(jobDoc._id, {
      status: 'failed',
      error: err.message || String(err),
      updated: Date.now(),
    });
    throw err;
  } finally {
    if (compressedPath) {
      try {
        await fs.unlink(compressedPath);
      } catch (cleanupErr) {
        console.warn(`[transcribe] cleanup of ${compressedPath} failed:`, cleanupErr.message);
      }
    }
  }
}

module.exports = transcribeWithOpenAI;
module.exports.__test__ = { needsCompression, compressToMp3, formatDiarizedJson, callOpenAI };
