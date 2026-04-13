// Ola CRM MCP — Controller adapter (A2)
//
// 把现有 CRM controller 的 (req, res, next) 签名包装成 async (input) => output，
// 让 MCP tools 能直接复用 controller，不必重写业务逻辑。
//
// 形状翻译：
//   CRM controller 通过 res.status(N).json({success, result, message}) 返回
//   MCP 工具期望 { ok, data, message } / { ok:false, code, message }
//
// 错误码映射（HTTP status → MCP code）：
//   200/201       → ok:true
//   400           → VALIDATION
//   401/403       → PERMISSION
//   404           → NOT_FOUND
//   409           → CONFLICT
//   500+ / throw  → INTERNAL
//
// 30s timeout 强制兜底，避免 controller 挂死阻塞 NanoBot。
//
// 注意：A2 阶段 adapter 是纯函数（不 require 任何 controller），方便单元自检。
// A5+ 才会被真实 CRUD tool 使用。

const DEFAULT_TIMEOUT_MS = 30 * 1000;

function statusToCode(status) {
  if (status >= 200 && status < 300) return null; // 成功无 code
  if (status === 400) return 'VALIDATION';
  if (status === 401 || status === 403) return 'PERMISSION';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  return 'INTERNAL';
}

/**
 * Build a minimal Express-like req object from MCP tool input.
 * Caller is responsible for passing `admin` if the controller needs it.
 *
 * @param {object} input
 * @param {object} [input.body]
 * @param {object} [input.params]
 * @param {object} [input.query]
 * @param {object} [input.admin]   // controller 通常依赖 req.admin._id 作为 owner
 * @param {object} [input.headers]
 */
function buildReq(input = {}) {
  return {
    body: input.body || {},
    params: input.params || {},
    query: input.query || {},
    admin: input.admin || null,
    headers: input.headers || {},
    // 一些 controller 会用 req.method / req.originalUrl 做 logging，给点合理默认
    method: 'POST',
    originalUrl: '/mcp/internal',
  };
}

/**
 * Build a mock res that captures status + json payload into a promise.
 * Supports the chained pattern `res.status(N).json(payload)`.
 */
function buildRes() {
  let statusCode = 200;
  let resolvePayload;
  let rejectPayload;
  const payloadPromise = new Promise((resolve, reject) => {
    resolvePayload = resolve;
    rejectPayload = reject;
  });

  const res = {
    statusCode,
    headersSent: false,
    status(code) {
      statusCode = code;
      res.statusCode = code;
      return res;
    },
    json(payload) {
      res.headersSent = true;
      resolvePayload({ status: statusCode, payload });
      return res;
    },
    send(payload) {
      // 少数 controller 用 res.send 而非 res.json，兼容一下
      res.headersSent = true;
      resolvePayload({ status: statusCode, payload });
      return res;
    },
    // 如果 controller 既不 json 也不 send（极少见），由 timeout 兜底
    _fail: (err) => rejectPayload(err),
  };
  return { res, payloadPromise };
}

/**
 * Translate CRM controller payload {success, result, message} into MCP shape.
 */
function translatePayload(status, payload) {
  // controller 偶尔可能直接 res.json(rawData) 不带 success 字段，做防御
  const success = payload && typeof payload === 'object' && 'success' in payload
    ? payload.success
    : status >= 200 && status < 300;

  if (success) {
    return {
      ok: true,
      data: payload && 'result' in payload ? payload.result : payload,
      message: (payload && payload.message) || undefined,
    };
  }
  const code = statusToCode(status) || 'INTERNAL';
  return {
    ok: false,
    code,
    message: (payload && payload.message) || `controller returned status ${status}`,
    data: payload && 'result' in payload ? payload.result : undefined,
  };
}

/**
 * Run a CRM controller as if it were an async function.
 *
 * @param {Function} controller  Express handler `(req, res, next) => any`
 * @param {object}   input       MCP tool input (body/params/query/admin/headers)
 * @param {object}   [opts]
 * @param {number}   [opts.timeoutMs=30000]
 * @returns {Promise<{ok:boolean, data?:any, code?:string, message?:string}>}
 */
async function runController(controller, input, opts = {}) {
  if (typeof controller !== 'function') {
    throw new TypeError('controllerAdapter: controller must be a function');
  }
  const timeoutMs = opts.timeoutMs || DEFAULT_TIMEOUT_MS;
  const req = buildReq(input);
  const { res, payloadPromise } = buildRes();

  let timeoutHandle;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`controller timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    // controller 本身可能 sync 也可能 async，统一 await 处理
    // next 用一个 throw shim：CRM controller 走 catchErrors wrapper 后基本不会
    // 调 next(err)，但万一调了我们要把 err 抛出来，不能 swallow
    const next = (err) => {
      if (err) res._fail(err instanceof Error ? err : new Error(String(err)));
    };
    const controllerPromise = Promise.resolve()
      .then(() => controller(req, res, next))
      .catch((err) => res._fail(err));

    // 等 res.json 被调用，或 controller 抛错，或超时
    const { status, payload } = await Promise.race([payloadPromise, timeoutPromise]);
    // controllerPromise 可能还在跑（某些 fire-and-forget 场景），但我们已经拿到结果
    // 不 await 它，避免被卡死。任何残留 rejection 走 unhandledRejection（A1 已挂全局）
    void controllerPromise;
    return translatePayload(status, payload);
  } catch (err) {
    return {
      ok: false,
      code: 'INTERNAL',
      message: err && err.message ? err.message : String(err),
    };
  } finally {
    clearTimeout(timeoutHandle);
  }
}

module.exports = {
  runController,
  // exported for unit self-check / future reuse
  buildReq,
  buildRes,
  translatePayload,
  statusToCode,
};
