const http = require('http');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { toolEventsToBlocks } = require('./toolResultToBlocks');
const { labelFor, STAGE_LABELS } = require('./thinkingLabels');

const ChatSession = mongoose.model('ChatSession');
const ChatMessage = mongoose.model('ChatMessage');

// Read env at request time so tests / hot-reload can override per call.
const NANOBOT_TIMEOUT_MS = 120000;
function nanobotEndpoint() {
  return {
    host: process.env.NANOBOT_HOST || '127.0.0.1',
    port: process.env.NANOBOT_PORT || 8900,
  };
}

// ---------------------------------------------------------------------------
// SSE writer helpers — output frames to the client (browser-facing protocol).
// Schema documented in ola/plans/ thinking_panel plan §4.1.
// ---------------------------------------------------------------------------

function writeSSE(res, eventName, data) {
  res.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
}

// ---------------------------------------------------------------------------
// SSE parser — incremental decoder for NanoBot's upstream SSE stream.
// NanoBot sends two kinds of frames:
//   1. Default event (no `event:` line): OpenAI chat.completion.chunk JSON
//      → for us, only the choices[0].delta.content matters
//   2. Named `event: tool_event`: our L1 addition, JSON tool_event payload
// And the literal terminator `data: [DONE]`.
// ---------------------------------------------------------------------------

function makeSSEParser(onFrame) {
  let buffer = '';
  return {
    feed(chunkStr) {
      buffer += chunkStr;
      // SSE frames are separated by blank lines (\n\n).
      let sep;
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        const rawFrame = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        if (!rawFrame.trim()) continue;
        let eventName = 'message';
        const dataLines = [];
        for (const line of rawFrame.split('\n')) {
          if (line.startsWith('event:')) {
            eventName = line.slice('event:'.length).trim();
          } else if (line.startsWith('data:')) {
            dataLines.push(line.slice('data:'.length).trim());
          }
        }
        const dataStr = dataLines.join('\n');
        onFrame(eventName, dataStr);
      }
    },
    flush() {
      if (buffer.trim()) {
        // Drop trailing partial frame — NanoBot always ends with [DONE]\n\n.
        buffer = '';
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Auto-title (unchanged from prior implementation, just relocated).
// ---------------------------------------------------------------------------

function generateTitle(session, messages) {
  const conversation = messages
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');
  const prompt = `Based on this conversation, generate a short title (max 6 words, no quotes, no punctuation at the end). Reply with ONLY the title, nothing else.\n\n${conversation}`;
  const payload = JSON.stringify({ messages: [{ role: 'user', content: prompt }] });
  const { host, port } = nanobotEndpoint();
  const options = {
    hostname: host,
    port,
    path: '/v1/chat/completions',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
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

function maybeAutoTitle(session, userMessage, assistantContent) {
  if (session.title !== 'New Chat') return;
  ChatMessage.countDocuments({ sessionId: session._id, removed: false })
    .then((count) => {
      if (count >= 4) {
        return ChatMessage.find({ sessionId: session._id, removed: false })
          .sort({ created: 1 }).lean()
          .then((msgs) => generateTitle(session, msgs));
      }
    })
    .catch((err) => console.error(`[AutoTitle] count/find failed for session ${session._id}:`, err.message));
}

// ---------------------------------------------------------------------------
// Main handler — POST /api/ola/chat
// Streams Server-Sent Events to the client; pipes from NanoBot upstream and
// translates NanoBot's frames to our user-facing protocol while buffering
// content + thinking trace for persistence to ChatMessage on stream end.
// ---------------------------------------------------------------------------

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
    const nanobotSessionId = `user:${userId}:conv:${uuidv4()}`;
    session = await ChatSession.create({ userId, nanobotSessionId, createdBy: userId });
  }

  // Switch to SSE mode.
  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // hint to nginx not to buffer
  res.flushHeaders();

  // Accumulators for stream-end persistence + final `done` frame payload.
  const thinkingSteps = []; // [{label, ts}] — drives thinking_trace block
  const finalToolEvents = []; // phase==='end' payloads → toolEventsToBlocks → widgets
  let streamedText = '';
  let upstreamFinished = false;
  let upstreamErrored = false;

  const proxyPayload = JSON.stringify({
    messages: [{ role: 'user', content: message.trim() }],
    session_id: session.nanobotSessionId,
    stream: true,
  });

  const { host: nanoHost, port: nanoPort } = nanobotEndpoint();
  const proxyOptions = {
    hostname: nanoHost,
    port: nanoPort,
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(proxyPayload),
      'Accept': 'text/event-stream',
    },
    timeout: NANOBOT_TIMEOUT_MS,
  };

  const handleUpstreamFrame = (eventName, dataStr) => {
    if (eventName === 'tool_event') {
      let payload;
      try { payload = JSON.parse(dataStr); } catch { return; }
      if (payload.phase === 'start') {
        const label = labelFor(payload.name);
        if (label) {
          const step = { label, ts: Date.now() };
          thinkingSteps.push(step);
          writeSSE(res, 'thinking_step', step);
        }
      } else if (payload.phase === 'end' || payload.phase === 'error') {
        finalToolEvents.push(payload);
      }
      return;
    }
    // Default event = OpenAI chat.completion.chunk
    if (dataStr === '[DONE]') return;
    let chunk;
    try { chunk = JSON.parse(dataStr); } catch { return; }
    const delta = chunk?.choices?.[0]?.delta?.content;
    if (typeof delta === 'string' && delta.length > 0) {
      streamedText += delta;
      writeSSE(res, 'text_token', { delta });
    }
  };

  const finishStream = () => {
    if (res.writableEnded) return;
    // Build final blocks: thinking_trace prepend → text → widgets from tool_events.
    const blocks = [];
    if (thinkingSteps.length > 0) {
      blocks.push({ type: 'thinking_trace', steps: thinkingSteps });
    }
    if (streamedText.length > 0) {
      blocks.push({ type: 'text', content: streamedText });
    }
    blocks.push(...toolEventsToBlocks(finalToolEvents));

    writeSSE(res, 'done', { sessionId: session._id, blocks });
    res.end();

    // Fire-and-forget persistence.
    if (streamedText.length > 0 || blocks.length > 0) {
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
          content: streamedText,
          blocks,
          createdBy: userId,
        },
      ])
        .then(() => maybeAutoTitle(session, message.trim(), streamedText))
        .catch((err) => {
          console.error(
            `[ChatMessage] Persist failed for session ${session._id}:`,
            err.message,
          );
        });
    }
  };

  const failStream = (errMessage) => {
    if (res.writableEnded) return;
    upstreamErrored = true;
    writeSSE(res, 'error', { message: errMessage });
    res.end();
  };

  const proxyReq = http.request(proxyOptions, (proxyRes) => {
    if (proxyRes.statusCode !== 200) {
      // NanoBot returned a JSON error envelope (4xx/5xx). Drain and surface.
      let buf = '';
      proxyRes.setEncoding('utf8');
      proxyRes.on('data', (c) => { buf += c; });
      proxyRes.on('end', () => {
        let errMsg = 'NanoBot 返回错误';
        try {
          const parsed = JSON.parse(buf);
          if (parsed?.error?.message) errMsg = parsed.error.message;
        } catch { /* keep default */ }
        failStream(`NanoBot ${proxyRes.statusCode}: ${errMsg}`);
      });
      return;
    }

    proxyRes.setEncoding('utf8');
    const parser = makeSSEParser(handleUpstreamFrame);
    proxyRes.on('data', (chunk) => parser.feed(chunk));
    proxyRes.on('end', () => {
      parser.flush();
      upstreamFinished = true;
      finishStream();
    });
    proxyRes.on('error', (err) => {
      failStream(`NanoBot stream error: ${err.message}`);
    });
  });

  proxyReq.on('error', (err) => {
    failStream(`无法连接 NanoBot 服务 (${nanoHost}:${nanoPort}): ${err.message}`);
  });
  proxyReq.on('timeout', () => {
    proxyReq.destroy();
    failStream(`NanoBot 请求超时 (${NANOBOT_TIMEOUT_MS / 1000}s)`);
  });

  // Client disconnect — abort upstream so we don't keep doing work for nobody.
  req.on('close', () => {
    if (!upstreamFinished && !upstreamErrored) {
      proxyReq.destroy();
    }
  });

  proxyReq.write(proxyPayload);
  proxyReq.end();
};

module.exports = chat;
