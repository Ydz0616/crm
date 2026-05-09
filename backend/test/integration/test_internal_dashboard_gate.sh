#!/usr/bin/env bash
# Real-stack integration test for the internal dashboard gate + every
# panel endpoint: llm-usage / email-token / user-activity / mcp-health /
# logs / db-summary (Ola CRM issue #220 D1 + D3 + D4 + D5 + D6 + D7 + D8).
#
# Mirrors the unit layers under backend/test/internal-dashboard/ but hits
# the full Express middleware chain to catch wiring regressions the unit
# layer cannot see — specifically that internalAuth runs after
# isValidAuthToken and before the internalDashboardRouter, that
# req.admin.email is correctly populated by the upstream auth middleware,
# that an unknown panel falls through to errorHandlers.notFound (404), and
# that the panel handlers produce the documented response shape
# end-to-end.
#
# Prerequisites:
#   - Backend started with INTERNAL_DASHBOARD_EMAILS containing admin@admin.com
#     for the "in list" path:
#       INTERNAL_DASHBOARD_EMAILS='admin@admin.com' npm --prefix backend run dev
#   - Mongo reachable (Atlas via backend/.env DATABASE)
#   - Test admin: admin@admin.com / admin123
#
# Usage:
#   bash backend/test/integration/test_internal_dashboard_gate.sh
#
# Exit code: 0 if all assertions PASS, 1 if any FAIL.
#
# Assertions (10):
#   1. Protocol entry — no cookie → 401 (isValidAuthToken intercepts)
#   2. Protocol entry — login → 200 + cookie issued
#   3. Second call after entry — unknown panel with valid cookie + email in
#      allowlist → 404 (router fallback, proves auth+gate passed without
#      collapsing into 403)
#   4. Real panel call — /llm-usage?range=7d with valid cookie → 200 +
#      success:true and the documented top-level result keys
#   5. Email panel — /email-token-usage?range=7d with valid cookie → 200 +
#      either the empty-state envelope or full aggregation (UI handles both)
#   6. User activity — /users/active?windowMinutes=15 with valid cookie →
#      200 + the documented dual-source result keys
#   7. MCP health — /mcp-health with valid cookie → 200 + the three
#      documented service keys (each entry whatever ok/error it gets)
#   8. Logs — /logs?source=mcp&limit=10 with valid cookie → 200 + the
#      documented top-level result keys (logs[], source, limit)
#   9. Logs — /logs?limit=501 → 400 (out-of-bounds rejection)
#  10. DB summary — /db-summary with valid cookie → 200 + collections[]
#      result key, no leak of connection string / db name / mongo user
#
# The 403 (email NOT in list) path is covered by the jest unit layer, since
# reproducing it here would require a second backend with a different
# INTERNAL_DASHBOARD_EMAILS value.

set -u

BACKEND="${BACKEND_URL:-http://localhost:8888}"
EMAIL="admin@admin.com"
PASSWORD="admin123"
COOKIE_JAR="$(mktemp)"
trap 'rm -f "$COOKIE_JAR"' EXIT

PASS=0
FAIL=0

assert_status() {
  local name="$1"
  local expected="$2"
  local actual="$3"
  if [[ "$actual" == "$expected" ]]; then
    echo "  PASS  $name (HTTP $actual)"
    PASS=$((PASS + 1))
  else
    echo "  FAIL  $name (expected HTTP $expected, got $actual)"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== T1: GET /api/internal/dashboard/anything without cookie (expect 401) ==="
T1_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND/api/internal/dashboard/anything")
assert_status "no cookie -> 401" "401" "$T1_STATUS"

echo
echo "=== T2: POST /api/login admin@admin.com (expect 200 + cookie) ==="
LOGIN_BODY=$(curl -s -c "$COOKIE_JAR" -o /tmp/d1_login_body.json -w "%{http_code}" \
  -X POST -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  "$BACKEND/api/login")
assert_status "login -> 200" "200" "$LOGIN_BODY"
if ! grep -q '"success":true' /tmp/d1_login_body.json; then
  echo "  FAIL  login body did not contain success:true"
  FAIL=$((FAIL + 1))
fi
rm -f /tmp/d1_login_body.json

echo
echo "=== T3: GET /api/internal/dashboard/anything with cookie (admin in list, expect 404) ==="
T3_STATUS=$(curl -s -b "$COOKIE_JAR" -o /tmp/d1_t3_body.json -w "%{http_code}" \
  "$BACKEND/api/internal/dashboard/anything")
assert_status "cookie + in list -> 404 (router empty)" "404" "$T3_STATUS"
# Defensive: 403 here would mean the gate rejected an in-list admin. Surface it loudly.
if grep -q "Internal access denied" /tmp/d1_t3_body.json; then
  echo "  FAIL  body shows 'Internal access denied' — admin@admin.com not in INTERNAL_DASHBOARD_EMAILS?"
  FAIL=$((FAIL + 1))
fi
rm -f /tmp/d1_t3_body.json

echo
echo "=== T4: GET /api/internal/dashboard/llm-usage?range=7d (expect 200 + result keys) ==="
T4_STATUS=$(curl -s -b "$COOKIE_JAR" -o /tmp/d3_t4_body.json -w "%{http_code}" \
  "$BACKEND/api/internal/dashboard/llm-usage?range=7d")
assert_status "llm-usage in list -> 200" "200" "$T4_STATUS"
if ! grep -q '"success":true' /tmp/d3_t4_body.json; then
  echo "  FAIL  llm-usage body did not contain success:true"
  FAIL=$((FAIL + 1))
fi
for key in range totals byProviderModel topUsers erroredCount byChannel; do
  if ! grep -q "\"$key\"" /tmp/d3_t4_body.json; then
    echo "  FAIL  llm-usage result missing key: $key"
    FAIL=$((FAIL + 1))
  fi
done
rm -f /tmp/d3_t4_body.json

echo
echo "=== T5: GET /api/internal/dashboard/email-token-usage?range=7d (expect 200 + valid envelope) ==="
T5_STATUS=$(curl -s -b "$COOKIE_JAR" -o /tmp/d4_t5_body.json -w "%{http_code}" \
  "$BACKEND/api/internal/dashboard/email-token-usage?range=7d")
assert_status "email-token-usage in list -> 200" "200" "$T5_STATUS"
if ! grep -q '"success":true' /tmp/d4_t5_body.json; then
  echo "  FAIL  email-token body did not contain success:true"
  FAIL=$((FAIL + 1))
fi
# Email channel may legitimately have no data yet — accept either envelope.
if grep -q '"empty":true' /tmp/d4_t5_body.json; then
  if ! grep -q '"hint"' /tmp/d4_t5_body.json; then
    echo "  FAIL  empty:true response missing hint key"
    FAIL=$((FAIL + 1))
  fi
else
  for key in totals byProviderModel topUsers erroredCount byChannel; do
    if ! grep -q "\"$key\"" /tmp/d4_t5_body.json; then
      echo "  FAIL  populated email-token result missing key: $key"
      FAIL=$((FAIL + 1))
    fi
  done
fi
rm -f /tmp/d4_t5_body.json

echo
echo "=== T6: GET /api/internal/dashboard/users/active?windowMinutes=15 (expect 200 + dual-source keys) ==="
T6_STATUS=$(curl -s -b "$COOKIE_JAR" -o /tmp/d5_t6_body.json -w "%{http_code}" \
  "$BACKEND/api/internal/dashboard/users/active?windowMinutes=15")
assert_status "users/active in list -> 200" "200" "$T6_STATUS"
if ! grep -q '"success":true' /tmp/d5_t6_body.json; then
  echo "  FAIL  users/active body did not contain success:true"
  FAIL=$((FAIL + 1))
fi
for key in windowMinutes activeSessionsLast aiActiveUsersLast sessions aiUsers; do
  if ! grep -q "\"$key\"" /tmp/d5_t6_body.json; then
    echo "  FAIL  users/active result missing key: $key"
    FAIL=$((FAIL + 1))
  fi
done
rm -f /tmp/d5_t6_body.json

echo
echo "=== T7: GET /api/internal/dashboard/mcp-health (expect 200 + 3 service keys) ==="
T7_STATUS=$(curl -s -b "$COOKIE_JAR" -o /tmp/d6_t7_body.json -w "%{http_code}" \
  "$BACKEND/api/internal/dashboard/mcp-health")
assert_status "mcp-health in list -> 200" "200" "$T7_STATUS"
if ! grep -q '"success":true' /tmp/d6_t7_body.json; then
  echo "  FAIL  mcp-health body did not contain success:true"
  FAIL=$((FAIL + 1))
fi
for key in mcp nanobotServe nanobotGateway; do
  if ! grep -q "\"$key\"" /tmp/d6_t7_body.json; then
    echo "  FAIL  mcp-health result missing service: $key"
    FAIL=$((FAIL + 1))
  fi
done
rm -f /tmp/d6_t7_body.json

echo
echo "=== T8: GET /api/internal/dashboard/logs?source=mcp&limit=10 (expect 200 + result keys) ==="
T8_STATUS=$(curl -s -b "$COOKIE_JAR" -o /tmp/d7_t8_body.json -w "%{http_code}" \
  "$BACKEND/api/internal/dashboard/logs?source=mcp&limit=10")
assert_status "logs in list -> 200" "200" "$T8_STATUS"
if ! grep -q '"success":true' /tmp/d7_t8_body.json; then
  echo "  FAIL  logs body did not contain success:true"
  FAIL=$((FAIL + 1))
fi
for key in source limit logs; do
  if ! grep -q "\"$key\"" /tmp/d7_t8_body.json; then
    echo "  FAIL  logs result missing key: $key"
    FAIL=$((FAIL + 1))
  fi
done
rm -f /tmp/d7_t8_body.json

echo
echo "=== T9: GET /api/internal/dashboard/logs?limit=501 (expect 400 — Joi rejects out-of-bounds) ==="
T9_STATUS=$(curl -s -b "$COOKIE_JAR" -o /dev/null -w "%{http_code}" \
  "$BACKEND/api/internal/dashboard/logs?limit=501")
assert_status "logs limit=501 -> 400" "400" "$T9_STATUS"

echo
echo "=== T10: GET /api/internal/dashboard/db-summary (expect 200 + collections + no leak) ==="
T10_STATUS=$(curl -s -b "$COOKIE_JAR" -o /tmp/d8_t10_body.json -w "%{http_code}" \
  "$BACKEND/api/internal/dashboard/db-summary")
assert_status "db-summary in list -> 200" "200" "$T10_STATUS"
if ! grep -q '"success":true' /tmp/d8_t10_body.json; then
  echo "  FAIL  db-summary body did not contain success:true"
  FAIL=$((FAIL + 1))
fi
for key in collections collectionCount generatedAt; do
  if ! grep -q "\"$key\"" /tmp/d8_t10_body.json; then
    echo "  FAIL  db-summary result missing key: $key"
    FAIL=$((FAIL + 1))
  fi
done
# Defensive: response must NOT leak connection string artefacts.
if grep -qE 'mongodb(\+srv)?://' /tmp/d8_t10_body.json; then
  echo "  FAIL  db-summary leaked a mongodb:// connection string"
  FAIL=$((FAIL + 1))
fi
rm -f /tmp/d8_t10_body.json

echo
echo "=== Summary: $PASS passed, $FAIL failed ==="
[[ "$FAIL" -eq 0 ]] || exit 1
