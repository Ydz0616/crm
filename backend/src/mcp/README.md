# Ola CRM — MCP Server

把 CRM 业务能力（客户、商品、报价 CRUD 等）通过 [Model Context Protocol](https://modelcontextprotocol.io) 暴露给 NanoBot，作为 Lead-to-Quote 闭环的工具层。

## 架构

独立 Node 进程，与主 backend / NanoBot **同机** 部署，仅监听 loopback：

```
NanoBot (127.0.0.1:8900)  ──streamableHttp──▶  MCP server (127.0.0.1:8889/mcp)
                                                       │
                                                       ▼
                                              CRM controllers (require)
                                                       │
                                                       ▼
                                                 MongoDB (Atlas)
```

- **Transport:** `streamableHttp`，stateless 模式（每次请求独立，无 session）
- **Auth:** Bearer token（`MCP_SERVICE_TOKEN` env，A2 加）
- **绑定:** `127.0.0.1` only — 永不出网卡，loopback 是唯一入口
- **进程隔离:** 独立于主 backend，崩溃不影响 CRM web

## 启动

```bash
cd backend
npm run mcp:dev
```

启动成功标志：

```
[mcp] listening on http://127.0.0.1:8889/mcp
[mcp] tools registered: 0 (A1 skeleton)
```

## 探活

```bash
curl -i http://127.0.0.1:8889/mcp        # GET → 405 (stateless 模式不接受 GET)
ps -o rss= -p $(pgrep -f 'src/mcp/server.js')  # RAM in KB，预算 < 80MB
```

## 环境变量

| Var | 必填 | 说明 |
|---|---|---|
| `MCP_PORT` | 否 | 默认 `8889` |
| `MCP_SERVICE_TOKEN` | A2 起必填 | NanoBot 在 `Authorization: Bearer ...` 里发送的 service token |
| `DATABASE` | A5 起必填 | MongoDB 连接串（A1-A4 不连 mongo） |

⚠️ 不要从代码里改 `.env`，让 zyd 手动加。

## 目录结构（演进）

```
src/mcp/
├── server.js              # A1 — 进程入口 + Express + transport
├── README.md              # 本文件
├── auth.js                # A2 — Bearer token 校验
├── logger.js              # A3 — 审计日志（backend/logs/mcp.log）
├── adapters/
│   └── controllerAdapter.js  # A2 — 把 CRM controller (req,res) 包成 (input)→(output)
├── tools/
│   ├── registry.js        # A4 — 自动发现并注册下面的工具
│   ├── crud/              # A5/A6/A7 — 自动复用 controller 的 CRUD 工具
│   │   ├── customer.js
│   │   ├── merch.js
│   │   └── quote.js
│   └── compute/           # 未来 — 确定性计算工具（profitMargin / freightCalc / fxConvert）
│       └── README.md      # 扩展指引
└── schemas/               # tool input/output 的 JSON Schema
```

## 设计原则

1. **薄翻译层** — MCP 不重新实现业务逻辑，全部走现有 controller，保证 MCP 和 REST 行为一致
2. **错误模型** — 所有响应统一 `{ok, data}` / `{ok:false, code, message}`；业务"找不到"用 `{found:false, message}` 而非空数组
3. **无 silent error** — 任何异常必须 log + 返回明确 code，绝不静默吞掉
4. **RAM 预算** — 整个进程 < 80MB（8 台 2GB 机器约束）
5. **扩展位** — `tools/compute/` 给未来"绝不让 LLM 自己算"的确定性数学留位置

## 当前状态

- [x] **A1** 骨架：Express + transport + 空工具列表
- [x] **A2** Bearer auth + controllerAdapter
- [x] **A3** 审计日志 + 错误模型统一
- [x] **A4** 工具注册表（auto-discovery）
- [x] **A5/A6/A7** customer / merch / quote CRUD 工具（+ `health.ping`，共 13 工具）
- [x] **C1** NanoBot 接入 — Ola workspace + config template 落在 `ola/nanobot-workspace/` + `ola/nanobot.config.template.json`；`start-dev.sh` 在首次启动自动 render 到 `~/.nanobot/`（closes #78）
- [x] **C2** Ola persona prompt — vendored `SOUL.md`（sales-assistant，禁编价、明确 missing-Merch / missing-Customer 流）；后续调优在 #70 推进

详见根目录 `task.md`。
