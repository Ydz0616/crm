#!/usr/bin/env bash
# Real-stack integration test for LLMUsage telemetry (Ola CRM issue #98).
#
# Mirrors test_ola_chat_sse.sh but verifies the data-collection side: a real
# Ask Ola turn against the running stack must produce a real LLMUsage row in
# Mongo with correct token counts, iteration count, and a non-zero costUsd.
#
# Unlike the jest layer (backend/test/llmUsage.chat.test.js, fake NanoBot)
# this hits the FULL stack: CRM backend → real NanoBot → real MCP → real
# Mongo → real Gemini. Catches integration bugs the mock layer can't see —
# specifically the SSE wire format round-trip between nanobot's _sse_usage()
# and chat.js's `eventName === 'usage'` parser.
#
# Prerequisites:
#   - Full dev stack running: bash ~/Documents/Work/SeekMi_Tech/Ola/start-dev.sh
#   - Backend on 8888, NanoBot on 8900, Mongo accessible
#   - Test admin: admin@admin.com / admin123
#
# Usage:
#   bash backend/test/integration/test_llm_usage.sh
#
# Exit code: 0 if all scenarios PASS, 1 if any FAIL.
#
# Scenarios:
#   1. Auth gate: /api/llmusage/list without cookie → 401
#   2. denyWrite: POST /api/llmusage/create with valid cookie → 403 with
#      Chinese message
#   3. Read access: GET /api/llmusage/list with cookie → 200 + result array
#      (initial may be empty depending on prior runs)
#   4. End-to-end persistence: chat → wait → /api/llmusage/list shows new
#      row with iterations >= 1 and costUsd > 0
#   5. Tool-using turn → iterations >= 2 (validates the runner.llm_call_count
#      plumbing through to the SSE usage frame)

set -u

BACKEND="${BACKEND_URL:-http://localhost:8888}"
EMAIL="admin@admin.com"
PASSWORD="admin123"

WORKDIR="$(mktemp -d "${TMPDIR:-/tmp}/ola-llmusage-XXXX")"
COOKIE_JAR="$WORKDIR/cookies.txt"
trap 'rm -rf "$WORKDIR"' EXIT

PASSES=0
FAILS=0

red()    { printf '\033[31m%s\033[0m\n' "$*"; }
green()  { printf '\033[32m%s\033[0m\n' "$*"; }

# ---------------------------------------------------------------------------
# Pre-flight + login
# ---------------------------------------------------------------------------

echo "==> Pre-flight: backend reachable at $BACKEND?"
if ! curl -sf -o /dev/null --max-time 5 "$BACKEND/health"; then
  red "FAIL: cannot reach $BACKEND/health — is start-dev.sh running?"
  exit 1
fi
green "    OK"

echo "==> Login as $EMAIL to capture cookie"
LOGIN_RESP="$WORKDIR/login.json"
curl -s -X POST "$BACKEND/api/login" \
  -H 'Content-Type: application/json' \
  -c "$COOKIE_JAR" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  > "$LOGIN_RESP"

if ! grep -q '"success":true' "$LOGIN_RESP"; then
  red "FAIL: login failed — see $LOGIN_RESP"
  cat "$LOGIN_RESP"
  exit 1
fi
if ! grep -q 'token' "$COOKIE_JAR"; then
  red "FAIL: no 'token' cookie in jar"
  exit 1
fi
green "    OK (cookie set)"

# ---------------------------------------------------------------------------
# Scenario 1 — auth gate
# ---------------------------------------------------------------------------

echo
echo "==> Scenario 1: /api/llmusage/list without cookie → 401"
S1_STATUS=$(curl -s -o /dev/null -w '%{http_code}' "$BACKEND/api/llmusage/list")
if [[ "$S1_STATUS" == "401" ]]; then
  green "    PASS — got 401 as expected"
  PASSES=$((PASSES + 1))
else
  red "    FAIL — got HTTP $S1_STATUS, expected 401"
  FAILS=$((FAILS + 1))
fi

# ---------------------------------------------------------------------------
# Scenario 2 — denyWrite (system-internal collection)
# ---------------------------------------------------------------------------

echo
echo "==> Scenario 2: POST /api/llmusage/create with admin cookie → 403"
S2_BODY="$WORKDIR/s2.json"
S2_STATUS=$(curl -s -o "$S2_BODY" -w '%{http_code}' -X POST "$BACKEND/api/llmusage/create" \
  -H 'Content-Type: application/json' \
  -b "$COOKIE_JAR" \
  -d '{"userId":"abc","sessionId":"xyz","provider":"gemini","model":"x","inputTokens":1,"outputTokens":1,"totalTokens":2,"costUsd":0.001,"pricingVersion":"x","latencyMs":100,"nanobotSessionId":"x","requestId":"x"}')
if [[ "$S2_STATUS" == "403" ]] \
   && grep -q '"success":false' "$S2_BODY" \
   && grep -q 'LLMUsage 写入仅限系统内部' "$S2_BODY"; then
  green "    PASS — got 403 with the documented Chinese message"
  PASSES=$((PASSES + 1))
else
  red "    FAIL — got HTTP $S2_STATUS, body:"
  cat "$S2_BODY"
  FAILS=$((FAILS + 1))
fi

# ---------------------------------------------------------------------------
# Scenario 3 — read path is accessible (for the future dashboard)
# ---------------------------------------------------------------------------

echo
echo "==> Scenario 3: GET /api/llmusage/list with cookie → 200 + result array"
S3_BODY="$WORKDIR/s3.json"
S3_STATUS=$(curl -s -o "$S3_BODY" -w '%{http_code}' "$BACKEND/api/llmusage/list" \
  -b "$COOKIE_JAR")
if [[ "$S3_STATUS" == "200" ]] && grep -q '"success":true' "$S3_BODY" \
   && grep -q '"result":' "$S3_BODY"; then
  green "    PASS — list endpoint returns success envelope"
  PASSES=$((PASSES + 1))
else
  red "    FAIL — got HTTP $S3_STATUS, body:"
  cat "$S3_BODY"
  FAILS=$((FAILS + 1))
fi

# ---------------------------------------------------------------------------
# Scenario 4 — chat → LLMUsage row written
# ---------------------------------------------------------------------------

# Capture a baseline list pagination header so we can detect a NEW row.
echo
echo "==> Scenario 4: chat turn produces a new LLMUsage row with costUsd > 0"
S4_BASELINE="$WORKDIR/s4_baseline.json"
curl -s -o "$S4_BASELINE" "$BACKEND/api/llmusage/list?items=1" -b "$COOKIE_JAR"
BASELINE_TOTAL=$(grep -o '"count":[0-9]*' "$S4_BASELINE" | head -1 | grep -o '[0-9]*' || echo 0)
echo "    baseline llmusage count: $BASELINE_TOTAL"

# Send a pure-text chat (deterministic, no tool calls; iterations should be 1).
S4_SSE="$WORKDIR/s4.sse"
curl -sN -X POST "$BACKEND/api/ola/chat" \
  -H 'Content-Type: application/json' \
  -b "$COOKIE_JAR" \
  --max-time 90 \
  -d '{"message":"Reply with the single word: pong. Do not call any tools."}' \
  > "$S4_SSE" 2>&1

if ! grep -q '^event: done' "$S4_SSE"; then
  red "    FAIL — chat did not produce a done frame; full SSE: $S4_SSE"
  FAILS=$((FAILS + 1))
else
  # LLMUsage write is fire-and-forget. Allow up to 3s to settle.
  echo "    chat returned, waiting for fire-and-forget LLMUsage write..."
  sleep 3
  S4_AFTER="$WORKDIR/s4_after.json"
  curl -s -o "$S4_AFTER" "$BACKEND/api/llmusage/list?items=1" -b "$COOKIE_JAR"
  AFTER_TOTAL=$(grep -o '"count":[0-9]*' "$S4_AFTER" | head -1 | grep -o '[0-9]*' || echo 0)
  echo "    after-chat llmusage count: $AFTER_TOTAL"

  if [[ $AFTER_TOTAL -le $BASELINE_TOTAL ]]; then
    red "    FAIL — count did not increase (baseline=$BASELINE_TOTAL, after=$AFTER_TOTAL)"
    cat "$S4_AFTER"
    FAILS=$((FAILS + 1))
  else
    # Inspect the newest row.
    INPUT_TOKENS=$(grep -o '"inputTokens":[0-9]*' "$S4_AFTER" | head -1 | grep -o '[0-9]*')
    OUTPUT_TOKENS=$(grep -o '"outputTokens":[0-9]*' "$S4_AFTER" | head -1 | grep -o '[0-9]*')
    COST_USD=$(grep -o '"costUsd":[0-9.eE+-]*' "$S4_AFTER" | head -1 | sed 's/"costUsd"://')
    ITERATIONS=$(grep -o '"iterations":[0-9]*' "$S4_AFTER" | head -1 | grep -o '[0-9]*')

    if [[ -n "$INPUT_TOKENS" && "$INPUT_TOKENS" -gt 0 ]] \
       && [[ -n "$OUTPUT_TOKENS" && "$OUTPUT_TOKENS" -gt 0 ]] \
       && [[ -n "$COST_USD" ]] \
       && awk "BEGIN{exit !($COST_USD > 0)}" \
       && [[ "$ITERATIONS" -ge 1 ]]; then
      green "    PASS — new row: input=$INPUT_TOKENS output=$OUTPUT_TOKENS iterations=$ITERATIONS cost=\$$COST_USD"
      PASSES=$((PASSES + 1))
    else
      red "    FAIL — newest row missing/invalid: input=$INPUT_TOKENS output=$OUTPUT_TOKENS iterations=$ITERATIONS cost=$COST_USD"
      cat "$S4_AFTER"
      FAILS=$((FAILS + 1))
    fi
  fi
fi

# ---------------------------------------------------------------------------
# Scenario 5 — tool-using turn → iterations >= 2
# ---------------------------------------------------------------------------

echo
echo "==> Scenario 5: tool-using chat → LLMUsage row with iterations >= 2"
S5_BASELINE="$WORKDIR/s5_baseline.json"
curl -s -o "$S5_BASELINE" "$BACKEND/api/llmusage/list?items=1" -b "$COOKIE_JAR"
BASE5_TOTAL=$(grep -o '"count":[0-9]*' "$S5_BASELINE" | head -1 | grep -o '[0-9]*' || echo 0)

S5_SSE="$WORKDIR/s5.sse"
curl -sN -X POST "$BACKEND/api/ola/chat" \
  -H 'Content-Type: application/json' \
  -b "$COOKIE_JAR" \
  --max-time 90 \
  -d '{"message":"Please use the merch.search tool to look up products containing the word stainless. Then summarize what you found in one sentence."}' \
  > "$S5_SSE" 2>&1

if ! grep -q '^event: done' "$S5_SSE"; then
  red "    FAIL — tool-using chat did not produce a done frame"
  FAILS=$((FAILS + 1))
else
  sleep 3
  S5_AFTER="$WORKDIR/s5_after.json"
  curl -s -o "$S5_AFTER" "$BACKEND/api/llmusage/list?items=1" -b "$COOKIE_JAR"
  AFTER5_TOTAL=$(grep -o '"count":[0-9]*' "$S5_AFTER" | head -1 | grep -o '[0-9]*' || echo 0)
  ITER5=$(grep -o '"iterations":[0-9]*' "$S5_AFTER" | head -1 | grep -o '[0-9]*')

  if [[ $AFTER5_TOTAL -le $BASE5_TOTAL ]]; then
    red "    FAIL — no new row after tool-using chat"
    FAILS=$((FAILS + 1))
  elif [[ -z "$ITER5" || "$ITER5" -lt 2 ]]; then
    red "    FAIL — iterations=$ITER5 (expected >= 2 for a tool-using turn)"
    cat "$S5_AFTER"
    FAILS=$((FAILS + 1))
  else
    green "    PASS — tool-using turn recorded iterations=$ITER5 (>= 2)"
    PASSES=$((PASSES + 1))
  fi
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

echo
echo "==================================================================="
if [[ $FAILS -eq 0 ]]; then
  green "ALL $PASSES SCENARIOS PASSED"
  exit 0
else
  red "FAILED: $FAILS scenario(s) failed, $PASSES passed"
  echo "Artifacts kept at $WORKDIR (manual inspection)"
  trap - EXIT
  exit 1
fi
