---
description: Ola CRM 项目启动 — 确认环境并启动前后端服务
---

# 🚀 Ola CRM 项目启动

> 本文件帮助你正确启动 Ola CRM 的开发环境。
> 根据操作者身份和需求，选择对应的启动场景。

---

## 启动前检查

在启动任何服务之前，按顺序执行以下检查：

### 1. 拉取最新代码
```bash
git pull
```
确保本地代码与远程仓库同步。如有冲突需先解决。

### 2. Node.js 版本
```bash
node -v
```
要求 >= 20.0.0。项目 `engines` 声明 20.9.0，但 20+ 均可运行。

### 3. 依赖同步
```bash
# 后端
cd backend && npm install

# 前端
cd frontend && npm install
```
如果 `node_modules` 已存在且 `package.json` 未变更，可跳过。

### 4. 环境变量

**后端 `backend/.env`：**
必须包含以下字段（参考 `backend/.env.example`）：

| 变量 | 说明 | 示例 |
|------|------|------|
| `DATABASE` | MongoDB Atlas 连接字符串 | `mongodb+srv://user:pass@cluster0.xxx.mongodb.net/dbname` |
| `JWT_SECRET` | JWT 签名密钥 | 任意随机字符串 |
| `NODE_ENV` | 环境 | `development` |

可选变量：`OPENAI_API_KEY`、`RESEND_API`、`GOTENBERG_URL`

**前端 `frontend/.env`：**

| 变量 | 说明 | 默认值 |
|------|------|-------|
| `VITE_BACKEND_SERVER` | 后端地址 | `http://localhost:8888/` |
| `VITE_DEV_REMOTE` | 是否连远程后端 | 不设置 = 连本地 |
| `VITE_DEV_BYPASS_AUTH` | 绕过登录墙 | `true`（仅开发用） |

---
## 场景 D：一键启动本地环境（推荐）

通过主目录的 Bash 脚本，一键启动后端、前端、MCP 和 NanoBot 服务。

### 步骤

```bash
bash start-dev.sh
```

**脚本功能：**
1. **服务并行启动**：后端 (8888)、MCP (8889)、NanoBot (8900)、前端 (3000) 将在后台运行。
2. **统一日志管理**：所有服务日志输出到 `/tmp/ola-{service}.log`。
3. **健康检查**：启动后自动检测各端口连通性。

**预期输出：**
```
=== Status ===
  Backend : running (port 8888)
  MCP     : running (port 8889)
  Frontend: running (port 3000)

Logs: /tmp/ola-{backend,mcp,nanobot,frontend}.log
Stop all: bash start-dev.sh
```

**停止服务：**
```bash
bash stop-dev.sh
```

---

## 场景 A：全栈开发（手动控制模式）

后端 + 前端都在本地运行，前端通过 Vite proxy 连接本地后端。

### 步骤

**Terminal 1 — 启动后端：**
```bash
cd backend && npm run dev
```

**预期输出（按顺序）：**
```
Connecting to MongoDB database: mongodb+srv://...
✅ MongoDB database connection established successfully
Express running → On PORT : 8888
```

**如果 MongoDB 连接失败：**
- 看到 `MongoDB connection error` → 检查 `backend/.env` 中 DATABASE 字段
- 连接超时 → 去 MongoDB Atlas 控制台检查 IP 白名单（Network Access → Add Current IP）
- 认证失败 → 确认用户名密码正确
- MongoDB Atlas 地址：https://cloud.mongodb.com/

**Terminal 2 — 启动前端：**

先确认 `frontend/.env` 配置为本地模式：
```
VITE_BACKEND_SERVER="http://localhost:8888/"
VITE_DEV_REMOTE=           # 注释掉或删除这行，不设置 = 连本地后端
```

然后启动：
```bash
cd frontend && npm run dev
```

**预期输出：**
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:80/
  ➜  Network: http://xxx.xxx.xxx.xxx:80/
```

**验证：** 浏览器打开 http://localhost（端口 80）。应该看到 Ola CRM 登录页或仪表板。

**端口 80 被占用？** 在 `frontend/.env` 加 `PORT=3000`，然后访问 http://localhost:3000

---

## 场景 B：仅前端开发（wzh 模式）

不启动本地后端，前端通过 Vite proxy 连接远程生产后端。

### 前提
- 生产后端 `https://app.olajob.cn` 正常运行
- 不需要本地 MongoDB

### 步骤

确认 `frontend/.env` 配置为远程模式：
```
VITE_BACKEND_SERVER="https://app.olajob.cn/"
VITE_DEV_REMOTE=remote
VITE_DEV_BYPASS_AUTH=true
```

启动前端：
```bash
cd frontend && npm run dev
```

或使用快捷命令（效果相同）：
```bash
cd frontend && npm run dev:remote
```

**验证：** 浏览器打开 http://localhost。API 请求会被 Vite proxy 转发到远程后端。

> ⚠️ 注意：这个模式下的写操作（创建/修改/删除）会直接影响生产数据库。仅用于 UI 调试。

---

## 场景 C：生产部署

将代码部署到服务器 `43.99.57.106`，通过 Docker Compose 构建运行。

### 前提
- 服务器 SSH 可连通
- `backend/.env.production` 已配置

### 步骤
```bash
bash deploy.sh
```

脚本自动执行：
1. 本地预检（检查 .env.production 存在）
2. `rsync` 同步代码到服务器
3. SSH 到服务器执行 `docker compose up -d --build`
4. 等待 15 秒后健康检查（容器状态 + HTTP 连通性）

**部署结果验证：** 访问 https://app.olajob.cn

---

## Vite Proxy 机制说明

前端 `/api/*` 请求不会直接发到后端，而是被 Vite dev server 代理：

```
浏览器 → http://localhost/api/quote/list
    ↓ Vite proxy
本地模式 → http://localhost:8888/api/quote/list
远程模式 → https://app.olajob.cn/api/quote/list
```

**Proxy 目标由 `frontend/.env` 决定：**
- `VITE_DEV_REMOTE` 未设置 → proxy 指向 `http://localhost:8888/`
- `VITE_DEV_REMOTE=remote` → proxy 指向 `VITE_BACKEND_SERVER` 的值

---

## 常见问题排查

| 问题 | 原因 | 解决 |
|------|------|------|
| 后端启动报 `MongoDB connection error` | `.env` 中 DATABASE URL 错误或 IP 未加白名单 | 检查 Atlas Network Access |
| 前端启动报端口被占用 | 80 端口已被其他服务使用 | `frontend/.env` 加 `PORT=3000` |
| 前端 API 返回 CORS 错误 | 后端 ALLOWED_ORIGINS 不含前端地址 | 开发模式下 `backend/.env` 不需要设 ALLOWED_ORIGINS（默认允许 localhost） |
| 前端页面白屏 | JS 报错，可能是 node_modules 版本不匹配 | `rm -rf node_modules && npm install` |
| `npm run dev` 报 engine 不匹配 | Node 版本 > 20.9.0 | 忽略警告，不影响运行 |