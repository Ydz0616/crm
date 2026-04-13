const http = require('http');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const ChatSession = mongoose.model('ChatSession');
const ChatMessage = mongoose.model('ChatMessage');

// NanoBot serve 地址，走环境变量，默认本地
const NANOBOT_HOST = process.env.NANOBOT_HOST || '127.0.0.1';
const NANOBOT_PORT = process.env.NANOBOT_PORT || 8900;
const NANOBOT_TIMEOUT_MS = 120000; // 2 分钟，与 nanobot 默认超时一致

/**
 * Fire-and-forget: ask NanoBot to generate a short title for the conversation.
 * Only called on the first exchange (when title is still "New Chat").
 */
function generateTitle(session, messages) {
  const conversation = messages
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');
  const prompt = `Based on this conversation, generate a short title (max 6 words, no quotes, no punctuation at the end). Reply with ONLY the title, nothing else.\n\n${conversation}`;

  const payload = JSON.stringify({
    messages: [{ role: 'user', content: prompt }],
  });

  const options = {
    hostname: NANOBOT_HOST,
    port: NANOBOT_PORT,
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
    timeout: 30000,
  };

  const titleReq = http.request(options, (titleRes) => {
    let data = '';
    titleRes.on('data', (chunk) => { data += chunk; });
    titleRes.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        const title = parsed.choices?.[0]?.message?.content?.trim();
        if (title && title.length > 0 && title.length <= 100) {
          ChatSession.findByIdAndUpdate(session._id, { title, updated: Date.now() }).catch((err) => {
            console.error(`[AutoTitle] Failed to update session ${session._id}:`, err.message);
          });
        }
      } catch (err) {
        console.error(`[AutoTitle] Failed to parse title response for session ${session._id}:`, err.message);
      }
    });
  });

  titleReq.on('error', (err) => {
    console.error(`[AutoTitle] Request failed for session ${session._id}:`, err.message);
  });

  titleReq.write(payload);
  titleReq.end();
}

const chat = async (req, res) => {
  const { message, sessionId } = req.body;

  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'message 字段为必填项，且不能为空字符串',
    });
  }

  const userId = req.admin._id;
  let session;

  // Resolve or create session
  if (sessionId) {
    session = await ChatSession.findOne({ _id: sessionId, userId, removed: false });
    if (!session) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Session not found',
      });
    }
  } else {
    // Auto-create session when frontend doesn't provide one (transitional)
    const nanobotSessionId = `user:${userId}:conv:${uuidv4()}`;
    session = await ChatSession.create({
      userId,
      nanobotSessionId,
      createdBy: userId,
    });
  }

  const payload = JSON.stringify({
    messages: [{ role: 'user', content: message.trim() }],
    session_id: session.nanobotSessionId,
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

          // Return response to client first
          res.status(200).json({
            success: true,
            result: {
              content,
              sessionId: session._id,
              model: parsed.model || null,
            },
            message: 'Chat response received',
          });
          resolve();

          // Fire-and-forget: persist messages, then check auto-title
          ChatMessage.insertMany([
            {
              sessionId: session._id,
              role: 'user',
              content: message.trim(),
              blocks: [{ type: 'text', content: message.trim() }],
              createdBy: userId,
            },
            {
              sessionId: session._id,
              role: 'assistant',
              content,
              blocks: [{ type: 'text', content }],
              createdBy: userId,
            },
          ]).then(() => {
            // Auto-generate title after 2nd exchange (4 messages = enough context)
            // Chained after insertMany to avoid race condition on count
            if (session.title === 'New Chat') {
              return ChatMessage.countDocuments({ sessionId: session._id, removed: false })
                .then((count) => {
                  if (count >= 4) {
                    return ChatMessage.find({ sessionId: session._id, removed: false })
                      .sort({ created: 1 }).lean()
                      .then((msgs) => generateTitle(session, msgs));
                  }
                });
            }
          }).catch((err) => {
            console.error(
              `[ChatMessage] Failed to persist messages for session ${session._id}:`,
              err.message,
              { sessionId: session._id, userMessage: message.trim(), assistantContent: content }
            );
          });
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
