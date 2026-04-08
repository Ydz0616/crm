// Ola CRM — MCP Server (Phase A1 skeleton)
//
// 独立 Node 进程，监听 127.0.0.1:8889/mcp，通过 Model Context Protocol
// 把 CRM 业务能力暴露给 NanoBot。本文件是 A1 骨架：空工具列表、无鉴权、
// 无审计日志、不连 mongoose。后续 A2/A3/A4 会逐层叠加。
//
// 启动: `npm run mcp:dev` (from backend/)
// 验收: curl http://127.0.0.1:8889/mcp 不 500；ps -o rss= < 80MB

require('module-alias/register');
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

const express = require('express');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const {
  StreamableHTTPServerTransport,
} = require('@modelcontextprotocol/sdk/server/streamableHttp.js');

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

async function main() {
  const mcpServer = new McpServer({
    name: 'ola-crm-mcp',
    version: '0.1.0',
  });

  // A1 阶段不注册任何工具。tool/list 会返回空数组。
  // A4 之后由 tools/registry.js 自动注册 crud/* 和 compute/*。

  // Stateless transport：sessionIdGenerator=undefined 表示不维护会话状态，
  // 每次请求独立。MVP 单 NanoBot 客户端足够，也最省 RAM。
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  await mcpServer.connect(transport);

  const app = express();

  // 仅在 /mcp 路由上挂 json parser，不全局挂 —— 全局挂会污染未来可能的
  // 其他路由（健康检查、metrics 等），保持最小作用域。
  app.post('/mcp', express.json({ limit: '1mb' }), async (req, res) => {
    try {
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
    console.log(`[mcp] tools registered: 0 (A1 skeleton)`);
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

main().catch((err) => {
  console.error('[mcp] failed to start:', err);
  process.exit(1);
});
