#!/bin/bash
# ─────────────────────────────────────────────────────────────
# DEMO: Rate Limiting
# Shows how the gateway blocks a client after 100 requests/min
# Usage: ./scripts/demo/demo-ratelimit.sh
#        ./scripts/demo/demo-ratelimit.sh http://your-ec2-ip:3001
# ─────────────────────────────────────────────────────────────

GATEWAY=${1:-http://localhost:3001}
TOKEN=${2:-demo_token}

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  DEMO: Rate Limiting"
echo "  Gateway: $GATEWAY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Sending 120 rapid requests..."
echo "  Watch http://localhost:3000 — 429s will appear on chart"
echo ""
sleep 2

ALLOWED=0
BLOCKED=0

for i in $(seq 1 120); do
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    "$GATEWAY/api/users")

  if [ "$RESPONSE" = "429" ]; then
    BLOCKED=$((BLOCKED + 1))
    echo "  [$i] 🚫 RATE LIMITED (429)"
  elif [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "401" ]; then
    ALLOWED=$((ALLOWED + 1))
    printf "  [%d] ✅ %s\n" "$i" "$RESPONSE"
  else
    printf "  [%d] ⚠️  %s\n" "$i" "$RESPONSE"
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Results: $ALLOWED allowed, $BLOCKED blocked"
echo "  Check your dashboard — request chart shows the spike"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"