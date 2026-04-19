// Ola CRM MCP — Audit logger (A3)
//
// 给每次 MCP 请求/工具调用打一行结构化 JSON 日志，落到 backend/logs/mcp.log。
// 用途: §7 审计追溯（understanding.md），后续 debug 和 NanoBot 行为复盘。
//
// 设计要点：
// - 不记录原始 input —— 只记 sha256 前 8 hex 当 input_hash，
//   能识别"两次调用是不是同样参数"但不写盘客户名/价格/任何业务字段
// - 不记录 output data —— 只记 ok/code/message
// - 异步 fire-and-forget 写盘，不阻塞响应；写盘失败 console.error 不影响业务
// - 不引入 winston/pino 等日志库 —— 纯 fs.appendFile 够用
// - 不做 log rotation —— 由运维 logrotate 处理
//
// 演进:
// - A3 阶段每个 POST /mcp 请求一行，tool 字段填 'mcp.request'
// - A4+ 改成每次 tool/call 一行，tool 字段填真实工具名（quote.create 等）

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 锚定到 backend 根的 logs/，与 cwd 解耦
const LOG_DIR = path.resolve(__dirname, '../../logs');
const LOG_FILE = path.join(LOG_DIR, 'mcp.log');

// 启动时确保目录存在；失败抛错让进程启动失败（fail-fast）
try {
  fs.mkdirSync(LOG_DIR, { recursive: true });
} catch (err) {
  throw new Error(`[mcp/logger] failed to create log dir ${LOG_DIR}: ${err.message}`);
}

/**
 * 计算 input 的 sha256 前 8 hex —— 稳定标识但不泄漏内容
 */
function hashInput(input) {
  try {
    const json = JSON.stringify(input ?? null);
    return crypto.createHash('sha256').update(json).digest('hex').slice(0, 8);
  } catch (err) {
    // 循环引用等极端情况
    return 'unhashable';
  }
}

/**
 * 写一行审计日志。Fire-and-forget，绝不阻塞调用方。
 *
 * @param {object} entry
 * @param {string} entry.tool         e.g. 'mcp.request' (A3) or 'quote.create' (A4+)
 * @param {string} entry.input_hash   from hashInput()
 * @param {number} entry.latency_ms
 * @param {boolean} entry.ok
 * @param {string|null} [entry.code]  error code on failure, null on success
 * @param {string} [entry.message]    optional error message (only on ok:false)
 */
function auditLog(entry) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    tool: entry.tool,
    input_hash: entry.input_hash,
    latency_ms: entry.latency_ms,
    ok: entry.ok,
    code: entry.code ?? null,
    ...(entry.message ? { message: entry.message } : {}),
  }) + '\n';

  fs.appendFile(LOG_FILE, line, (err) => {
    if (err) {
      // 写盘失败不阻塞业务，但必须 console.error，绝不 silent
      console.error(`[mcp/logger] audit write failed: ${err.message}`);
    }
  });
}

module.exports = {
  auditLog,
  hashInput,
  LOG_FILE,
  LOG_DIR,
};
