#!/bin/bash
# Ola CRM — one-shot dev startup
# Starts: backend (8888), MCP server (8889), NanoBot (8900), frontend (3000)
# Usage: bash start-dev.sh

set -e

CRM_DIR="$(cd "$(dirname "$0")" && pwd)"
# Repo was renamed nanobot → Ola_bot on GitHub. Prefer the new name; fall
# back to the old one so machines cloned before the rename still work.
if [ -d "$CRM_DIR/../Ola_bot" ]; then
  NANOBOT_DIR="$CRM_DIR/../Ola_bot"
else
  NANOBOT_DIR="$CRM_DIR/../nanobot"
fi

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "=== Ola CRM Dev Startup ==="
echo ""

# Kill any existing processes on our ports
for PORT in 8888 8889 8900 3000; do
  PID=$(lsof -ti:$PORT 2>/dev/null || true)
  if [ -n "$PID" ]; then
    echo -e "${YELLOW}Killing existing process on port $PORT (PID: $PID)${NC}"
    kill -9 $PID 2>/dev/null || true
    sleep 0.5
  fi
done

# 0. Pre-flight — verify backend/.env, provision ~/.nanobot/ on first boot
echo -e "${GREEN}[1/5] Pre-flight: checking backend/.env and nanobot workspace...${NC}"

if [ ! -f "$CRM_DIR/backend/.env" ]; then
  echo -e "${RED}     Missing $CRM_DIR/backend/.env${NC}"
  echo -e "${YELLOW}     Copy backend/.env.example to backend/.env and fill in required values (see ola/SETUP.md).${NC}"
  exit 1
fi

# First-boot: render ~/.nanobot/config.json from the vendored template.
# Idempotent — skips if config already exists, so local runtime state
# (memory/, sessions/) and any manual edits to config survive restarts.
# GEMINI_API_KEY only needs to be in backend/.env on the FIRST boot; after
# that nanobot reads the key from ~/.nanobot/config.json directly, so
# existing machines (where config is already provisioned) don't need to
# backfill their .env.
if [ ! -f "$HOME/.nanobot/config.json" ]; then
  mkdir -p "$HOME/.nanobot"
  (cd "$CRM_DIR/backend" && node -e '
    require("dotenv").config();
    const fs = require("fs"), os = require("os"), path = require("path");
    const { MCP_SERVICE_TOKEN, GEMINI_API_KEY } = process.env;
    const missing = [];
    if (!MCP_SERVICE_TOKEN) missing.push("MCP_SERVICE_TOKEN");
    if (!GEMINI_API_KEY)    missing.push("GEMINI_API_KEY");
    if (missing.length) {
      console.error("[provision] Missing in backend/.env: " + missing.join(", ") + " — see ola/SETUP.md");
      process.exit(1);
    }
    const tpl = fs.readFileSync(process.argv[1], "utf8");
    const rendered = tpl
      .replace(/\$\{MCP_SERVICE_TOKEN\}/g, MCP_SERVICE_TOKEN)
      .replace(/\$\{GEMINI_API_KEY\}/g, GEMINI_API_KEY);
    const dest = path.join(os.homedir(), ".nanobot", "config.json");
    fs.writeFileSync(dest, rendered, { mode: 0o600 });
  ' "$CRM_DIR/ola/nanobot.config.template.json")
  echo -e "     ${GREEN}Rendered ~/.nanobot/config.json (mode 600)${NC}"
else
  echo -e "     ${YELLOW}~/.nanobot/config.json already exists, skipping${NC}"
fi

# Sync Ola workspace prompts into ~/.nanobot/workspace/.
# Two categories with different sync rules:
#   - Canonical system prompts (SOUL/AGENTS/TOOLS) — we own them, ALWAYS
#     overwrite so every operator picks up prompt updates on next start.
#     Any local edit to ~/.nanobot/workspace/SOUL.md will be clobbered;
#     edit ola/nanobot-workspace/SOUL.md in the repo instead.
#   - Per-user files (USER/HEARTBEAT) — first-boot only, never clobber.
mkdir -p "$HOME/.nanobot/workspace"
for f in SOUL.md AGENTS.md TOOLS.md; do
  if [ -f "$CRM_DIR/ola/nanobot-workspace/$f" ]; then
    cp "$CRM_DIR/ola/nanobot-workspace/$f" "$HOME/.nanobot/workspace/$f"
  fi
done
echo -e "     ${GREEN}Synced canonical prompts (SOUL/AGENTS/TOOLS) → ~/.nanobot/workspace/${NC}"
for f in USER.md HEARTBEAT.md; do
  if [ ! -f "$HOME/.nanobot/workspace/$f" ] && [ -f "$CRM_DIR/ola/nanobot-workspace/$f" ]; then
    cp "$CRM_DIR/ola/nanobot-workspace/$f" "$HOME/.nanobot/workspace/$f"
    echo -e "     ${GREEN}Provisioned $f (first boot)${NC}"
  fi
done

# 1. Backend
echo -e "${GREEN}[2/5] Starting backend (port 8888) with nodemon hot reload...${NC}"
cd "$CRM_DIR/backend"
npx nodemon src/server.js --ignore public/ > /tmp/ola-backend.log 2>&1 &
BACKEND_PID=$!

# Wait for backend to bind port before starting MCP (both need MongoDB)
echo -n "     Waiting for backend..."
for i in $(seq 1 15); do
  if lsof -ti:8888 >/dev/null 2>&1; then
    echo -e " ${GREEN}ok${NC}"
    break
  fi
  sleep 1
  if [ $i -eq 15 ]; then
    echo -e " ${RED}timeout${NC}"
  fi
done

# 2. MCP Server
echo -e "${GREEN}[3/5] Starting MCP server (port 8889) with nodemon hot reload...${NC}"
cd "$CRM_DIR/backend"
npx nodemon --watch src/mcp src/mcp/server.js > /tmp/ola-mcp.log 2>&1 &
MCP_PID=$!

# Wait for MCP to bind port before later check_port falsely flags FAILED
echo -n "     Waiting for MCP..."
for i in $(seq 1 15); do
  if lsof -ti:8889 >/dev/null 2>&1; then
    echo -e " ${GREEN}ok${NC}"
    break
  fi
  sleep 1
  if [ $i -eq 15 ]; then
    echo -e " ${RED}timeout${NC}"
  fi
done

# 3. NanoBot
if [ -d "$NANOBOT_DIR" ]; then
  echo -e "${GREEN}[4/5] Starting NanoBot (port 8900)...${NC}"
  cd "$NANOBOT_DIR"
  python -m nanobot serve > /tmp/ola-nanobot.log 2>&1 &
  NANOBOT_PID=$!
else
  echo -e "${YELLOW}[4/5] NanoBot directory not found at $NANOBOT_DIR, skipping${NC}"
  NANOBOT_PID=""
fi

# 4. Frontend
echo -e "${GREEN}[5/5] Starting frontend (port 3000)...${NC}"
cd "$CRM_DIR/frontend"
npx vite --port 3000 > /tmp/ola-frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait for remaining services to come up
sleep 5

echo ""
echo "=== Status ==="

check_port() {
  if lsof -ti:$1 >/dev/null 2>&1; then
    echo -e "  $2: ${GREEN}running${NC} (port $1)"
  else
    echo -e "  $2: ${RED}FAILED${NC} — check /tmp/ola-$3.log"
  fi
}

check_port 8888 "Backend " "backend"
check_port 8889 "MCP     " "mcp"
if [ -n "$NANOBOT_PID" ]; then
  check_port 8900 "NanoBot " "nanobot"
fi
check_port 3000 "Frontend" "frontend"

echo ""
echo "Logs: /tmp/ola-{backend,mcp,nanobot,frontend}.log"
echo "Stop all: bash $CRM_DIR/stop-dev.sh"
echo ""

# Save PIDs for stop script
echo "$BACKEND_PID $MCP_PID $NANOBOT_PID $FRONTEND_PID" > /tmp/ola-dev-pids
