// Logs panel controller (#220 D7) — tail the structured JSON-Lines log
// produced by mcp/logger.js and return the last N entries to the
// internal dashboard.
//
// Read strategy: cap the read window at MAX_TAIL_BYTES so this endpoint
// stays bounded even if the log file balloons. We seek to (size - cap)
// and read forward; the very first line in that window is likely a
// partial line from mid-line truncation, which we drop via the
// JSON.parse try/catch. That same try/catch also drops genuinely
// malformed lines (e.g. a partially flushed write).
//
// What we strip before returning: every entry's `message` field passes
// through maskSecrets() — operators read this in a browser and we don't
// want a credential drifting from a backend log into a screenshare.
//
// What we DO NOT include: the absolute filesystem path. A read failure
// surfaces as a generic "Failed to read log file" rather than echoing
// /Users/duke/... back to the client.

const fs = require('fs');
const Joi = require('joi');

const { LOG_FILE: MCP_LOG_FILE } = require('@/mcp/logger');
const maskSecrets = require('@/utils/redactor');

// Source whitelist. v0 only exposes mcp; nanobot / email-channel logs
// are tracked in the discovered tech debt and will be added in a
// follow-up backlog.
const _sources = {
  mcp: MCP_LOG_FILE,
};

const querySchema = Joi.object({
  source: Joi.string()
    .valid(...Object.keys(_sources))
    .default('mcp'),
  limit: Joi.number().integer().min(1).max(500).default(100),
});

const MAX_TAIL_BYTES = 2 * 1024 * 1024; // 2 MB window — comfortably > 500 typical lines.

async function readTail(filePath) {
  let fd;
  try {
    const stat = await fs.promises.stat(filePath);
    const start = Math.max(0, stat.size - MAX_TAIL_BYTES);
    const len = stat.size - start;
    if (len === 0) return [];

    fd = await fs.promises.open(filePath, 'r');
    const buf = Buffer.alloc(len);
    await fd.read(buf, 0, len, start);
    const text = buf.toString('utf8');
    return text.split('\n').filter(Boolean);
  } finally {
    if (fd) await fd.close();
  }
}

async function getLogs(req, res) {
  const { value, error } = querySchema.validate(req.query, { stripUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      result: null,
      message: error.message,
    });
  }
  const { source, limit } = value;
  const filePath = _sources[source];

  let lines;
  try {
    lines = await readTail(filePath);
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      // Log file simply hasn't been written yet (fresh dev box). Treat as
      // empty rather than failing — the panel renders an empty state.
      return res.status(200).json({
        success: true,
        result: { source, limit, logs: [], totalLinesScanned: 0 },
        message: `Log file for ${source} not yet created`,
      });
    }
    console.error('[internalDashboard.getLogs] read failed:', err && err.message);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Failed to read log file',
    });
  }

  // Take the last N (after dropping any blank tail lines via .filter above).
  const tailLines = lines.slice(-limit);
  const logs = [];
  for (const line of tailLines) {
    let entry;
    try {
      entry = JSON.parse(line);
    } catch (_) {
      // Malformed — skip silently. The frontend would have nothing useful
      // to do with a half-line and listing them adds noise to the panel.
      continue;
    }
    if (entry && typeof entry === 'object' && entry.message) {
      entry.message = maskSecrets(String(entry.message));
    }
    logs.push(entry);
  }
  // Newest-first for the UI.
  logs.reverse();

  return res.status(200).json({
    success: true,
    result: {
      source,
      limit,
      logs,
      totalLinesScanned: tailLines.length,
    },
    message: `Tail of ${source} log`,
  });
}

module.exports = getLogs;
// Test hook — lets jest swap a temp file path in place of the real log.
module.exports._sources = _sources;
module.exports.MAX_TAIL_BYTES = MAX_TAIL_BYTES;
