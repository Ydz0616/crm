# 服务器部署（app.olatech.ai）

## 前提

- 服务器已装 Docker、Docker Compose
- Cloudflare DNS：`app.olatech.ai` → Box1 IP（橙云 Proxied + SSL Flexible）
- （过渡期）`app.olajob.cn` 同样解析到 Box1，两个域名并存 1-2 周后下架 olajob.cn
- Frontend 走 same-origin 相对路径，一份 build 两个域名通用，无需按域名重复构建

## 1. 克隆项目

```bash
cd /app   # 或你放项目的目录
git clone <你的仓库地址> crm
cd crm
```

## 2. 配置后端环境变量

```bash
cp backend/.env.box1.example backend/.env
nano backend/.env
```

填 `DATABASE`、`JWT_SECRET`。`ALLOWED_ORIGINS` 并存期设为 `https://app.olatech.ai,https://app.olajob.cn`，`PUBLIC_SERVER_FILE` 设为 `https://app.olatech.ai/`。

## 3. 构建并启动

```bash
docker compose up -d --build
```

## 4. 验证

- 本机：`curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:80` 应为 200
- 本机：`curl -s http://127.0.0.1:8888/health` 应有响应
- 浏览器打开 https://app.olatech.ai 应看到登录页
- 过渡期同样测试 https://app.olajob.cn 应可用

## 5. 之后更新代码

```bash
cd /app/crm
git pull
docker compose up -d --build
```

## 可选：Gotenberg（PDF 导出）

三箱拓扑中 Gotenberg 在 Box3 独立 docker run，不在本 compose 中。详见 `ola/DEPLOY_RUNBOOK.md`。
