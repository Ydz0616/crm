const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const { execFile } = require('child_process');
const { promisify } = require('util');
const FormData = require('form-data');
const axios = require('axios');
const mongoose = require('mongoose');

const { resolveUploadPath } = require('@/utils/uploadsPath');

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
  try {
    const response = await axios.post(OPENAI_URL, formData, {
      headers: { ...formData.getHeaders(), Authorization: `Bearer ${apiKey}` },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: parseInt(process.env.OPENAI_TRANSCRIPTION_TIMEOUT_MS, 10) || 600000,
    });
    return response.data;
  } catch (err) {
    // axios swallows the OpenAI error body — surface it so Job.error and the
    // structured log capture the real "why" instead of just the HTTP code.
    if (err && err.response) {
      const status = err.response.status;
      const body = err.response.data;
      const bodyJson =
        typeof body === 'object' ? JSON.stringify(body) : String(body).slice(0, 500);
      const detail =
        body && body.error && body.error.message
          ? body.error.message
          : bodyJson;
      const wrapped = new Error(`OpenAI HTTP ${status}: ${detail}`);
      wrapped.status = status;
      wrapped.openaiBody = body;
      throw wrapped;
    }
    throw err;
  }
}

async function transcribeWithOpenAI(fileDoc, jobDoc) {
  const Job = mongoose.model('Job');
  const startTs = Date.now();
  let compressedPath = null;
  console.log(
    `[transcribe.worker] job=${jobDoc._id} file=${fileDoc._id} name=${fileDoc.originalName} size=${fileDoc.sizeBytes} mime=${fileDoc.mimeType} status=pending→running`
  );
  try {
    await Job.findByIdAndUpdate(jobDoc._id, { status: 'running', updated: Date.now() });

    // #266: File.sourcePath is a relative path; resolve to absolute for ffmpeg
    // / OpenAI calls but never store the absolute form back.
    const absoluteSourcePath = resolveUploadPath(fileDoc.sourcePath);
    const audioPath = needsCompression(fileDoc)
      ? (compressedPath = await compressToMp3(absoluteSourcePath))
      : absoluteSourcePath;

    const payload = await callOpenAI(audioPath);
    const transcript = formatDiarizedJson(payload);
    if (!transcript || transcript.trim() === '') {
      throw new Error('OpenAI returned empty transcript');
    }

    // Sidecar lives next to the source on disk but is recorded as a relative
    // path in Job.result.sidecarPath (same portability invariant as #266).
    const relativeSidecarPath = fileDoc.sourcePath + '.txt';
    const absoluteSidecarPath = resolveUploadPath(relativeSidecarPath);
    await fs.writeFile(absoluteSidecarPath, transcript, 'utf-8');

    const durationMs = Date.now() - startTs;
    const transcriptBytes = Buffer.byteLength(transcript, 'utf-8');
    await Job.findByIdAndUpdate(jobDoc._id, {
      status: 'done',
      result: {
        sidecarPath: relativeSidecarPath,
        sizeBytes: transcriptBytes,
        durationMs,
      },
      updated: Date.now(),
    });
    console.log(
      `[transcribe.worker] job=${jobDoc._id} status=running→done duration_ms=${durationMs} sidecar_bytes=${transcriptBytes}`
    );
  } catch (err) {
    await Job.findByIdAndUpdate(jobDoc._id, {
      status: 'failed',
      error: err.message || String(err),
      updated: Date.now(),
    });
    console.error(
      `[transcribe.worker] job=${jobDoc._id} status=running→failed error=${err.message || String(err)}`
    );
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
