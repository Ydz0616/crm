#!/usr/bin/env bash
# Real-stack integration test for /api/ola/chat SSE pass-through.
# (Ola CRM issue #131, backlog L3 verification.)
#
# Unlike backend/test/olaController.chat.test.js (jest with mocked NanoBot),
# this hits the FULL stack: CRM backend → real NanoBot → real MCP → real Mongo
# → real Gemini. Catches integration bugs the mock layer can't see.
#
# Prerequisites:
#   - Full dev stack running: bash ~/Documents/GitHub/crm/start-dev.sh
#   - Backend on 8888, MCP on 8889, NanoBot on 8900, Mongo accessible
#   - Test admin: admin@admin.com / admin123 (per reference_external_systems memory)
#
# Usage:
#   bash backend/test/integration/test_ola_chat_sse.sh
#
# Exit code: 0 if all scenarios PASS, 1 if any FAIL.
#
# Scenarios:
#   1. Auth gate: /api/ola/chat without cookie → 401 (auth not bypassed by SSE)
#   2. Empty message → 400 with Chinese error (validation runs before SSE setup)
#   3. Happy path: tool-triggering message → SSE with thinking_step + text_token + done
#   4. Pure text prompt → SSE with text_token + done, NO thinking_step

set -u

BACKEND="${BACKEND_URL:-http://localhost:8888}"
EMAIL="admin@admin.com"
PASSWORD="admin123"

WORKDIR="$(mktemp -d "${TMPDIR:-/tmp}/ola-chat-integ-XXXX")"
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
  red "FAIL: no 'token' cookie in jar — see $COOKIE_JAR"
  cat "$COOKIE_JAR"
  exit 1
fi
green "    OK (cookie set)"

# ---------------------------------------------------------------------------
# Scenario 1 — auth gate (no cookie)
# ---------------------------------------------------------------------------

echo
echo "==> Scenario 1: /api/ola/chat without cookie → 401"
S1_STATUS=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BACKEND/api/ola/chat" \
  -H 'Content-Type: application/json' \
  -d '{"message":"hi"}')
if [[ "$S1_STATUS" == "401" ]]; then
  green "    PASS — got 401 as expected"
  PASSES=$((PASSES + 1))
else
  red "    FAIL — got HTTP $S1_STATUS, expected 401"
  FAILS=$((FAILS + 1))
fi

# ---------------------------------------------------------------------------
# Scenario 2 — empty message validation (early-return JSON, not SSE)
# ---------------------------------------------------------------------------

echo
echo "==> Scenario 2: empty message → 400 with Chinese error"
S2_BODY="$WORKDIR/s2.json"
S2_STATUS=$(curl -s -o "$S2_BODY" -w '%{http_code}' -X POST "$BACKEND/api/ola/chat" \
  -H 'Content-Type: application/json' \
  -b "$COOKIE_JAR" \
  -d '{"message":""}')
if [[ "$S2_STATUS" == "400" ]] && grep -q '"success":false' "$S2_BODY" \
   && grep -q 'message 字段' "$S2_BODY"; then
  green "    PASS — got 400 with specific message"
  PASSES=$((PASSES + 1))
else
  red "    FAIL — got HTTP $S2_STATUS, body:"
  cat "$S2_BODY"
  FAILS=$((FAILS + 1))
fi

# ---------------------------------------------------------------------------
# Scenario 3 — tool-triggering message → thinking_step + text_token + done
# ---------------------------------------------------------------------------

echo
echo "==> Scenario 3: tool-triggering message → SSE with thinking_step + text_token + done"
S3_BODY="$WORKDIR/s3.sse"
curl -sN -X POST "$BACKEND/api/ola/chat" \
  -H 'Content-Type: application/json' \
  -b "$COOKIE_JAR" \
  --max-time 90 \
  -d '{"message":"Please use the merch.search tool to find products containing the word stainless"}' \
  > "$S3_BODY" 2>&1

S3_THINKING=$(grep -c '^event: thinking_step' "$S3_BODY" || true)
S3_TEXT=$(grep -c '^event: text_token' "$S3_BODY" || true)
S3_DONE=$(grep -c '^event: done' "$S3_BODY" || true)
S3_LABEL=$(grep '^data: {"label"' "$S3_BODY" | head -1)

if [[ $S3_THINKING -ge 1 && $S3_TEXT -ge 1 && $S3_DONE -eq 1 ]] \
   && echo "$S3_LABEL" | grep -q 'Ola is searching your products\.\.\.'; then
  green "    PASS — thinking_step=$S3_THINKING (label '$S3_LABEL' = friendly), text_token=$S3_TEXT, done=$S3_DONE"
  PASSES=$((PASSES + 1))
else
  red "    FAIL — thinking_step=$S3_THINKING (>=1), text_token=$S3_TEXT (>=1), done=$S3_DONE (==1)"
  echo "    Sample label line: $S3_LABEL"
  echo "    Full SSE: $S3_BODY"
  FAILS=$((FAILS + 1))
fi

# ---------------------------------------------------------------------------
# Scenario 4 — pure text (no tool) → no thinking_step
# ---------------------------------------------------------------------------

echo
echo "==> Scenario 4: pure text prompt → SSE with text_token + done, NO thinking_step"
S4_BODY="$WORKDIR/s4.sse"
curl -sN -X POST "$BACKEND/api/ola/chat" \
  -H 'Content-Type: application/json' \
  -b "$COOKIE_JAR" \
  --max-time 90 \
  -d '{"message":"Reply with the single word: pong. Do not call any tools."}' \
  > "$S4_BODY" 2>&1

S4_THINKING=$(grep -c '^event: thinking_step' "$S4_BODY" || true)
S4_TEXT=$(grep -c '^event: text_token' "$S4_BODY" || true)
S4_DONE=$(grep -c '^event: done' "$S4_BODY" || true)

if [[ $S4_THINKING -eq 0 && $S4_TEXT -ge 1 && $S4_DONE -eq 1 ]]; then
  green "    PASS — thinking_step=0 (as expected), text_token=$S4_TEXT, done=$S4_DONE"
  PASSES=$((PASSES + 1))
else
  red "    FAIL — thinking_step=$S4_THINKING (==0), text_token=$S4_TEXT (>=1), done=$S4_DONE (==1)"
  echo "    Full SSE: $S4_BODY"
  FAILS=$((FAILS + 1))
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
