// Ola CRM MCP — Bearer token auth (A2)
//
// 服务级鉴权，不是用户 JWT。NanoBot 在每次 MCP 请求的
// `Authorization: Bearer <token>` header 里发送 service token，
// MCP server 比对 process.env.MCP_SERVICE_TOKEN。
//
// 设计要点：
// - 启动时 token 缺失 → fail-fast 退出，绝不允许"默认空 token = 无鉴权"
// - timing-safe 比较防 timing attack（token 是 32 hex bytes，理论上风险极小，
//   但 crypto.timingSafeEqual 是免费防御）
// - 401 错误信息**不区分** "缺 header" 和 "token 错"，避免给攻击者枚举提示

const crypto = require('crypto');

const ENV_VAR = 'MCP_SERVICE_TOKEN';

function loadServiceToken() {
  const token = process.env[ENV_VAR];
  if (!token || token.trim().length === 0) {
    throw new Error(
      `[mcp/auth] ${ENV_VAR} env var is required but missing or empty. ` +
        `Add it to backend/.env before starting the MCP server.`
    );
  }
  if (token.length < 16) {
    throw new Error(
      `[mcp/auth] ${ENV_VAR} is too short (${token.length} chars). ` +
        `Use at least 16 chars (32 hex bytes recommended).`
    );
  }
  return token;
}

// 启动时立即加载并缓存。任何错误都会让 require 抛错 → server.js 启动失败 → 进程退出。
const SERVICE_TOKEN = loadServiceToken();
const SERVICE_TOKEN_BUF = Buffer.from(SERVICE_TOKEN, 'utf8');

function unauthorized(res, reason) {
  // reason 只进 server log，不进响应体，避免给客户端不同提示
  console.warn(`[mcp/auth] 401: ${reason}`);
  res.status(401).json({
    ok: false,
    code: 'UNAUTHORIZED',
    message: 'missing or invalid Authorization header',
  });
}

function requireAuth(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || typeof header !== 'string') {
    return unauthorized(res, 'no authorization header');
  }
  if (!header.startsWith('Bearer ')) {
    return unauthorized(res, 'header is not Bearer scheme');
  }
  const presented = header.slice('Bearer '.length).trim();
  if (presented.length === 0) {
    return unauthorized(res, 'empty bearer token');
  }
  const presentedBuf = Buffer.from(presented, 'utf8');
  // timingSafeEqual 要求等长 buffer，长度不等直接拒
  if (presentedBuf.length !== SERVICE_TOKEN_BUF.length) {
    return unauthorized(res, 'token length mismatch');
  }
  if (!crypto.timingSafeEqual(presentedBuf, SERVICE_TOKEN_BUF)) {
    return unauthorized(res, 'token value mismatch');
  }
  return next();
}

module.exports = requireAuth;
module.exports.loadServiceToken = loadServiceToken; // exported for tests if needed
