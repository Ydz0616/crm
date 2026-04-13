const http = require('http');

// NanoBot serve 地址，走环境变量，默认本地
const NANOBOT_HOST = process.env.NANOBOT_HOST || '127.0.0.1';
const NANOBOT_PORT = process.env.NANOBOT_PORT || 8900;
const NANOBOT_TIMEOUT_MS = 120000; // 2 分钟，与 nanobot 默认超时一致

const chat = async (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'message 字段为必填项，且不能为空字符串',
    });
  }

  // session_id 格式: user:{userId}:conv:default
  // MVP 阶段每个用户一个默认会话，后续可扩展为多会话
  const userId = req.admin._id.toString();
  const sessionId = `user:${userId}:conv:default`;

  const payload = JSON.stringify({
    messages: [{ role: 'user', content: message.trim() }],
    session_id: sessionId,
  });

  return new Promise((resolve) => {
    const options = {
      hostname: NANOBOT_HOST,
      port: NANOBOT_PORT,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
      timeout: NANOBOT_TIMEOUT_MS,
    };

    const proxyReq = http.request(options, (proxyRes) => {
      let data = '';

      proxyRes.on('data', (chunk) => {
        data += chunk;
      });

      proxyRes.on('end', () => {
        try {
          const parsed = JSON.parse(data);

          // nanobot 返回错误
          if (parsed.error) {
            res.status(proxyRes.statusCode || 502).json({
              success: false,
              result: null,
              message: parsed.error.message || 'NanoBot 返回错误',
            });
            return resolve();
          }

          // 正常响应：提取 assistant content
          const content = parsed.choices?.[0]?.message?.content;

          if (!content) {
            res.status(502).json({
              success: false,
              result: null,
              message: 'NanoBot 返回了空响应',
            });
            return resolve();
          }

          res.status(200).json({
            success: true,
            result: {
              content,
              sessionId,
              model: parsed.model || null,
            },
            message: 'Chat response received',
          });
          return resolve();
        } catch (parseErr) {
          res.status(502).json({
            success: false,
            result: null,
            message: `NanoBot 响应解析失败: ${parseErr.message}`,
          });
          return resolve();
        }
      });
    });

    proxyReq.on('error', (err) => {
      res.status(503).json({
        success: false,
        result: null,
        message: `无法连接 NanoBot 服务 (${NANOBOT_HOST}:${NANOBOT_PORT}): ${err.message}`,
      });
      return resolve();
    });

    proxyReq.on('timeout', () => {
      proxyReq.destroy();
      res.status(504).json({
        success: false,
        result: null,
        message: `NanoBot 请求超时 (${NANOBOT_TIMEOUT_MS / 1000}s)`,
      });
      return resolve();
    });

    proxyReq.write(payload);
    proxyReq.end();
  });
};

module.exports = chat;
