#!/bin/bash
# Ola CRM — stop all dev services

echo "Stopping Ola dev services..."

# Kill nodemon parents first; otherwise they respawn the node child immediately
# after we kill it by port and stop-dev.sh appears to do nothing.
pkill -f "nodemon.*src/server\.js" 2>/dev/null && echo "  Killed nodemon (backend)" || true
pkill -f "nodemon.*src/mcp/server\.js" 2>/dev/null && echo "  Killed nodemon (mcp)" || true

for PORT in 8888 8889 8900 8901 3000; do
  PID=$(lsof -ti:$PORT 2>/dev/null || true)
  if [ -n "$PID" ]; then
    kill -9 $PID 2>/dev/null || true
    echo "  Killed process on port $PORT"
  fi
done

rm -f /tmp/ola-dev-pids
echo "Done."
