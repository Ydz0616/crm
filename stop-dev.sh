#!/bin/bash
# Ola CRM — stop all dev services

echo "Stopping Ola dev services..."

for PORT in 8888 8889 8900 3000; do
  PID=$(lsof -ti:$PORT 2>/dev/null || true)
  if [ -n "$PID" ]; then
    kill -9 $PID 2>/dev/null || true
    echo "  Killed process on port $PORT"
  fi
done

rm -f /tmp/ola-dev-pids
echo "Done."
