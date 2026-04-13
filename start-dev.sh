#!/bin/bash
# Ola CRM — one-shot dev startup
# Starts: backend (8888), MCP server (8889), NanoBot (8900), frontend (3000)
# Usage: bash start-dev.sh

set -e

CRM_DIR="$(cd "$(dirname "$0")" && pwd)"
NANOBOT_DIR="$CRM_DIR/../nanobot"

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

# 1. Backend
echo -e "${GREEN}[1/4] Starting backend (port 8888)...${NC}"
cd "$CRM_DIR/backend"
node src/server.js > /tmp/ola-backend.log 2>&1 &
BACKEND_PID=$!

# 2. MCP Server
echo -e "${GREEN}[2/4] Starting MCP server (port 8889)...${NC}"
node src/mcp/server.js > /tmp/ola-mcp.log 2>&1 &
MCP_PID=$!

# 3. NanoBot
if [ -d "$NANOBOT_DIR" ]; then
  echo -e "${GREEN}[3/4] Starting NanoBot (port 8900)...${NC}"
  cd "$NANOBOT_DIR"
  python -m nanobot serve > /tmp/ola-nanobot.log 2>&1 &
  NANOBOT_PID=$!
else
  echo -e "${YELLOW}[3/4] NanoBot directory not found at $NANOBOT_DIR, skipping${NC}"
  NANOBOT_PID=""
fi

# 4. Frontend
echo -e "${GREEN}[4/4] Starting frontend (port 3000)...${NC}"
cd "$CRM_DIR/frontend"
npx vite --port 3000 > /tmp/ola-frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait for services to come up
sleep 3

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
