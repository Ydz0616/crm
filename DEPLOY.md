# 服务器部署（erp.olajob.cn）

## 前提

- 服务器已装 Docker、Docker Compose
- 网关已配置 erp.olajob.cn 反代到本机 3000（前端）、8888（后端）
- 域名 erp.olajob.cn 已解析到服务器

## 1. 克隆项目

```bash
cd /app   # 或你放项目的目录
git clone <你的仓库地址> crm
cd crm
```

## 2. 配置后端环境变量

```bash
cp backend/.env.production.example backend/.env
nano backend/.env
```

把 `DATABASE`、`JWT_SECRET` 改成你的真实值即可，其余生产项（如 `ALLOWED_ORIGINS`、`PUBLIC_SERVER_FILE`）已按 erp.olajob.cn 写好。

## 3. 构建并启动

```bash
docker compose up -d --build
```

## 4. 验证

- 本机：`curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000` 应为 200  
- 本机：`curl -s http://127.0.0.1:8888/health` 应有响应  
- 浏览器打开 https://erp.olajob.cn 应看到登录页

## 5. 之后更新代码

```bash
cd /app/crm
git pull
docker compose up -d --build
```

## 可选：Gotenberg（PDF 导出）

若需要 PDF 导出，在 docker-compose.yml 中增加 gotenberg 服务，并在 backend 的 environment 中设置 `GOTENBERG_URL=http://gotenberg:3000`，同时将 backend 的 `depends_on` 指向 gotenberg。
