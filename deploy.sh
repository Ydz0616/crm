#!/bin/bash
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

# Configuration
SERVER_IP="${DEPLOY_SERVER_IP:-43.99.57.106}"
REMOTE_DIR="${DEPLOY_REMOTE_DIR:-/app/crm}"
SERVER="root@$SERVER_IP"

echo "========================================================"
echo "🚀 Ola ERP CRM - 生产环境部署脚本"
echo "========================================================"
echo "1. 本地预检 (环境与配置)"
echo "2. 源码同步 (rsync 推送到服务器)"
echo "3. 服务器构建并启动 (docker compose)"
echo "4. 健康检查 (容器状态 + 接口)"
echo "========================================================"

read -p "❓ 确认部署? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

echo "🔍 [1/5] 本地预检..."
if [ ! -f backend/.env.production ] && [ ! -f backend/.env ]; then
    echo "   ❌ 错误: 未找到 backend/.env.production 或 backend/.env"
    echo "      请先配置 backend/.env.production 再部署"
    exit 1
fi
if [ -f backend/.env.production ]; then
    echo "   ✅ 发现 backend/.env.production (服务器上将据此生成 .env)"
fi
echo "   ✅ 预检通过."

echo "📤 [2/5] 同步源代码..."
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'backend/.env' \
  --exclude 'frontend/dist' \
  --exclude 'backend/dist' \
  --exclude '*.log' \
  --exclude '.DS_Store' \
  "$ROOT/" "$SERVER:$REMOTE_DIR/"
echo "   ✅ 代码同步完成."

echo "🏗️  [3/5] 服务器构建与启动..."
ssh "$SERVER" "cd $REMOTE_DIR && (test -f backend/.env || cp backend/.env.production backend/.env) && docker compose up -d --build"

echo "   ⏳ 等待 15 秒后做健康检查..."
sleep 15

echo "🩺 [4/5] 健康检查..."
OUTPUT=$(ssh "$SERVER" "cd $REMOTE_DIR && docker compose ps --format '{{.Name}}: {{.State}}'")
echo "$OUTPUT"

if echo "$OUTPUT" | grep -q "Exited"; then
    echo "   ❌ 有容器已退出，抓取最近日志..."
    ssh "$SERVER" "cd $REMOTE_DIR && docker compose logs --tail=80"
    exit 1
elif echo "$OUTPUT" | grep -q "Restarting"; then
    echo "   ❌ 有容器在反复重启，抓取最近日志..."
    ssh "$SERVER" "cd $REMOTE_DIR && docker compose logs --tail=80"
    exit 1
else
    echo "   ✅ 所有容器运行中."
fi

echo "🌐 [5/5] 接口连通性检查..."
FRONTEND_CODE=$(ssh "$SERVER" "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:80" || echo "000")
BACKEND_CODE=$(ssh "$SERVER" "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8888/health" || echo "000")

if [ "$FRONTEND_CODE" = "200" ]; then
    echo "   ✅ 前端 :80: HTTP $FRONTEND_CODE"
else
    echo "   ⚠️ 前端 :80: HTTP $FRONTEND_CODE (预期 200)"
fi
if [ "$BACKEND_CODE" = "200" ]; then
    echo "   ✅ 后端 8888/health: HTTP $BACKEND_CODE"
else
    echo "   ⚠️ 后端 8888/health: HTTP $BACKEND_CODE (预期 200)"
fi

if [ "$FRONTEND_CODE" != "200" ] || [ "$BACKEND_CODE" != "200" ]; then
    echo "   📋 最近日志:"
    ssh "$SERVER" "cd $REMOTE_DIR && docker compose logs --tail=30"
fi

echo "========================================================"
echo "🎉 部署流程结束。请访问 https://app.olajob.cn 验证。"
echo "========================================================"
