// Ola CRM — MCP Server
//
// 独立 Node 进程，监听 127.0.0.1:8889/mcp，通过 Model Context Protocol
// 把 CRM 业务能力暴露给 NanoBot。
//
// 启动: `npm run mcp:dev` (from backend/)
//
// Stateless streamableHttp 模式：每个 POST /mcp 请求**自带完整生命周期**，
// 因此服务端必须 per-request 创建 server + transport，处理完销毁。
// A1 最初做成 singleton 是个 latent bug —— 只有 initialize 这种"协议入口"
// 调用刚好 work，第二个调用（如 tools/list）就 500。A2 一并修复。
// 参考: https://github.com/modelcontextprotocol/typescript-sdk#without-session-management-stateless

require('module-alias/register');
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

const express = require('express');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const {
  StreamableHTTPServerTransport,
} = require('@modelcontextprotocol/sdk/server/streamableHttp.js');

// require('./auth') 会在加载时校验 MCP_SERVICE_TOKEN env，缺失即抛错 → 整进程退出
const requireAuth = require('./auth');

const HOST = '127.0.0.1';
const PORT = Number(process.env.MCP_PORT) || 8889;

// 任何未捕获的异常都必须显式 log + 退出，绝不 silent error
process.on('unhandledRejection', (reason) => {
  console.error('[mcp] unhandledRejection:', reason);
  process.exit(1);
});
process.on('uncaughtException', (err) => {
  console.error('[mcp] uncaughtException:', err);
  process.exit(1);
});

/**
 * Factory: 每次请求创建一个全新的 McpServer，注册当前的工具集，返回未连接的实例。
 * A4 之后这里会调用 tools/registry.js 自动 import crud/* 和 compute/*。
 * A1-A3 阶段返回空工具集。
 */
function createMcpServer() {
  const server = new McpServer({
    name: 'ola-crm-mcp',
    version: '0.1.0',
  });
  // TODO(A4): registry.registerAll(server)
  return server;
}

function main() {
  const app = express();

  // POST /mcp —— 唯一的 MCP 入口。
  // 中间件顺序：先鉴权（无 token 直接 401，省 body parse），再 json parse，再 handler。
  app.post('/mcp', requireAuth, express.json({ limit: '1mb' }), async (req, res) => {
    // Stateless: per-request server + transport，确保每个 HTTP POST 是一个独立完整的 MCP 生命周期
    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    // 客户端断开 → 立即清理，防内存泄漏
    res.on('close', () => {
      transport.close().catch((e) => console.error('[mcp] transport close error:', e));
      server.close().catch((e) => console.error('[mcp] server close error:', e));
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      console.error('[mcp] POST /mcp handler error:', err);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        });
      }
    }
  });

  // GET/DELETE 在 stateless 模式下无意义 —— 明确返回 405，不要让 SDK 抛
  // 难懂的 session 错误。这样 curl 探活时也能拿到一个明确响应。
  const methodNotAllowed = (_req, res) => {
    res.status(405).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method not allowed in stateless mode' },
      id: null,
    });
  };
  app.get('/mcp', methodNotAllowed);
  app.delete('/mcp', methodNotAllowed);

  const httpServer = app.listen(PORT, HOST, () => {
    console.log(`[mcp] listening on http://${HOST}:${PORT}/mcp`);
    console.log(`[mcp] mode: stateless per-request, auth: bearer, tools: 0`);
  });

  // 优雅关闭，方便 nodemon / Ctrl+C 不留僵尸进程
  const shutdown = (signal) => {
    console.log(`[mcp] received ${signal}, shutting down`);
    httpServer.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main();
