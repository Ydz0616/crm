#!/usr/bin/env bash
# 生产部署 smoke 测试 —— 部署后必须跑，任一失败立即回滚
#
# 背景：2026-04-21 一晚 5 个 bug 都是"语法对 + 单元测试通过 + 看起来对"的代码，
# 但每一层都把上层的错静默吸收成不同症状（nginx 截路径、axios 双前缀、
# MCP 静默 fallback 到 loopback、JWT 返 5xx 卡死前端）。这套 smoke 在层与层
# 边界打真实流量，是唯一能堵住这类 bug 的测试。
#
# 用法：
#   bash scripts/smoke-prod.sh                    # 默认测两个域名 + MCP + nanobot
#   SKIP_MCP=1 bash scripts/smoke-prod.sh         # 不在 Tailscale 网络里跳过 MCP
#   SKIP_NANOBOT=1 bash scripts/smoke-prod.sh     # 跳过 nanobot E2E（最慢的一项）
#   DOMAINS="app.olatech.ai" bash scripts/smoke-prod.sh   # 只测一个域名
#
# 退出码：
#   0 = 全绿，部署验证通过
#   1 = 至少一项 fail，**立即回滚**，不要在生产 debug
#
# 测试账号 test@test.com / test1234 必须存在于 Atlas（dev seed）

set -uo pipefail

# ---------- 配置 ----------
DOMAINS="${DOMAINS:-app.olajob.cn app.olatech.ai}"
TEST_EMAIL="${TEST_EMAIL:-test@test.com}"
TEST_PASSWORD="${TEST_PASSWORD:-test1234}"
MCP_HOST="${MCP_HOST:-100.109.220.126}"
MCP_PORT="${MCP_PORT:-8889}"
MCP_SERVICE_TOKEN="${MCP_SERVICE_TOKEN:-}"
SKIP_MCP="${SKIP_MCP:-0}"
SKIP_NANOBOT="${SKIP_NANOBOT:-0}"
NANOBOT_TIMEOUT="${NANOBOT_TIMEOUT:-90}"  # nanobot 长链路 LLM 调用允许 90s

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASS=0
FAIL=0
FAILED_TESTS=()
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

# ---------- 工具函数 ----------
pass() {
  echo -e "  ${GREEN}✓${NC} $1"
  PASS=$((PASS + 1))
}

fail() {
  echo -e "  ${RED}✗${NC} $1"
  FAIL=$((FAIL + 1))
  FAILED_TESTS+=("$1")
}

skip() {
  echo -e "  ${YELLOW}—${NC} $1"
}

section() {
  echo ""
  echo -e "${BLUE}===== $1 =====${NC}"
}

# 期望某个 HTTP status code
check_status() {
  local desc=$1 expected=$2 actual=$3
  if [ "$actual" = "$expected" ]; then
    pass "$desc → HTTP $actual"
  else
    fail "$desc → expected HTTP $expected, got $actual"
  fi
}

# 期望响应 body 含某个字符串
check_contains() {
  local desc=$1 pattern=$2 body=$3
  if echo "$body" | grep -q "$pattern"; then
    pass "$desc → contains '$pattern'"
  else
    fail "$desc → missing '$pattern' (body: $(echo "$body" | head -c 150))"
  fi
}

# ---------- 自动读取 MCP_SERVICE_TOKEN（仅当未通过 env 提供） ----------
if [ -z "$MCP_SERVICE_TOKEN" ] && [ "$SKIP_MCP" != "1" ]; then
  if [ -f backend/.env ]; then
    MCP_SERVICE_TOKEN=$(grep '^MCP_SERVICE_TOKEN=' backend/.env 2>/dev/null | cut -d= -f2- | tr -d '"' | tr -d "'" | tr -d '\r')
  fi
fi

# ---------- Per-domain 测试 ----------
for DOMAIN in $DOMAINS; do
  section "$DOMAIN"
  JAR="$TMPDIR/jar-${DOMAIN//./_}"

  # 1. 健康检查：外层入口应通
  STATUS=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "https://$DOMAIN/health" 2>/dev/null || echo "000")
  check_status "health endpoint" "200" "$STATUS"

  # 2. 未认证 API 必须返 401（不能是 404/502/503，最能暴露路径截断和代理 bug）
  STATUS=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "https://$DOMAIN/api/setting/listAll" 2>/dev/null || echo "000")
  check_status "unauthenticated /api/setting/listAll" "401" "$STATUS"

  # 3. 完整登录链：POST → success
  LOGIN_HTTP=$(mktemp)
  LOGIN_BODY=$(curl -s --max-time 15 -c "$JAR" -w '%{http_code}' -o "$LOGIN_HTTP" \
    -X POST "https://$DOMAIN/api/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" 2>/dev/null || echo "000")
  if [ "$LOGIN_BODY" = "200" ]; then
    BODY=$(cat "$LOGIN_HTTP")
    check_contains "login response success flag" '"success":true' "$BODY"
  else
    fail "login HTTP status → expected 200, got $LOGIN_BODY"
  fi
  rm -f "$LOGIN_HTTP"

  # 4. Cookie 必须落到 jar（验证 Set-Cookie header 浏览器能接受）
  if [ -s "$JAR" ] && grep -qE 'token|connect\.sid|jwt' "$JAR" 2>/dev/null; then
    pass "auth cookie set in jar"
  else
    fail "no auth cookie in jar after login (Set-Cookie 被浏览器拒绝？检查 Secure/Partitioned/SameSite)"
  fi

  # 5. 带 cookie 再请求受保护 API → 200
  AUTH_BODY=$(curl -s --max-time 10 -b "$JAR" "https://$DOMAIN/api/setting/listAll" 2>/dev/null || echo "{}")
  check_contains "authenticated /api/setting/listAll" '"success"' "$AUTH_BODY"

  # 6. logout
  STATUS=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 -b "$JAR" \
    -X POST "https://$DOMAIN/api/logout" 2>/dev/null || echo "000")
  check_status "logout" "200" "$STATUS"
done

# ---------- MCP 跨机可达 ----------
section "MCP server ($MCP_HOST:$MCP_PORT)"
if [ "$SKIP_MCP" = "1" ]; then
  skip "MCP test (SKIP_MCP=1)"
elif [ -z "$MCP_SERVICE_TOKEN" ]; then
  skip "MCP test (no MCP_SERVICE_TOKEN, set env or run from project root with backend/.env)"
else
  # 用 Tailscale IP 而不是 loopback —— 验证 MCP_BIND_ADDR 没退化（PR #126）
  STATUS=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 \
    -X POST "http://$MCP_HOST:$MCP_PORT/mcp" \
    -H "Authorization: Bearer $MCP_SERVICE_TOKEN" \
    -H 'Content-Type: application/json' \
    -H 'Accept: application/json, text/event-stream' \
    -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' 2>/dev/null || echo "000")
  # streamableHttp 协议返 200 + SSE，少了 Accept header 就 406
  check_status "MCP tools/list via Tailscale" "200" "$STATUS"

  # 验证未授权确实被拒（safety check）
  STATUS_NO_AUTH=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 \
    -X POST "http://$MCP_HOST:$MCP_PORT/mcp" \
    -H 'Content-Type: application/json' \
    -H 'Accept: application/json, text/event-stream' \
    -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' 2>/dev/null || echo "000")
  if [ "$STATUS_NO_AUTH" = "401" ] || [ "$STATUS_NO_AUTH" = "403" ]; then
    pass "MCP rejects unauthenticated → HTTP $STATUS_NO_AUTH"
  else
    fail "MCP unauth check → expected 401/403, got $STATUS_NO_AUTH (auth bypass?)"
  fi
fi

# ---------- NanoBot end-to-end（最慢，放最后） ----------
section "NanoBot E2E (chat + MCP tool path)"
if [ "$SKIP_NANOBOT" = "1" ]; then
  skip "NanoBot E2E (SKIP_NANOBOT=1)"
else
  PRIMARY_DOMAIN=$(echo $DOMAINS | awk '{print $1}')
  JAR="$TMPDIR/nb-jar"

  # 重新登录拿 cookie
  curl -s --max-time 15 -c "$JAR" -X POST "https://$PRIMARY_DOMAIN/api/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" > /dev/null 2>&1

  # 发 tool-call prompt：让 nanobot 必须调 MCP 才能回答
  CHAT_HTTP=$(mktemp)
  CHAT_STATUS=$(curl -s --max-time "$NANOBOT_TIMEOUT" -b "$JAR" -w '%{http_code}' -o "$CHAT_HTTP" \
    -X POST "https://$PRIMARY_DOMAIN/api/ola/chat" \
    -H 'Content-Type: application/json' \
    -d '{"message":"列出系统里前 3 个客户的名字"}' 2>/dev/null || echo "000")

  if [ "$CHAT_STATUS" = "200" ]; then
    BODY=$(cat "$CHAT_HTTP")
    BODY_LEN=${#BODY}
    if [ $BODY_LEN -lt 50 ]; then
      fail "nanobot response too short (${BODY_LEN} bytes): $BODY"
    elif echo "$BODY" | grep -qiE 'socket hang up|ECONNREFUSED|EHOSTUNREACH|MCP.*error|tool.*error'; then
      fail "nanobot response contains tool/MCP error: $(echo "$BODY" | head -c 200)"
    else
      pass "nanobot chat returned ${BODY_LEN} bytes (no socket-hangup / MCP error)"
    fi
  else
    fail "nanobot chat HTTP → expected 200, got $CHAT_STATUS"
  fi
  rm -f "$CHAT_HTTP"
fi

# ---------- 汇总 ----------
echo ""
echo -e "${BLUE}==========================================${NC}"
echo "Results: $PASS passed, $FAIL failed"

if [ $FAIL -gt 0 ]; then
  echo ""
  echo -e "${RED}FAILED:${NC}"
  for t in "${FAILED_TESTS[@]}"; do
    echo "  - $t"
  done
  echo ""
  echo -e "${RED}❌ DEPLOYMENT NOT VERIFIED${NC}"
  echo -e "${RED}   立即回滚，不要在生产 debug：${NC}"
  echo "   git reset --hard <last-good-sha> && docker compose up -d"
  exit 1
fi

echo ""
echo -e "${GREEN}✓ ALL CHECKS PASSED — Deployment verified${NC}"
exit 0
