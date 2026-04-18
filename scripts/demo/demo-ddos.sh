#!/bin/bash
# ─────────────────────────────────────────────────────────────
# DEMO: DDoS Simulation
# Uses k6 to simulate a sudden traffic spike
# Requires k6 installed: brew install k6
# Usage: ./scripts/demo/demo-ddos.sh
#        ./scripts/demo/demo-ddos.sh http://your-ec2-ip:3001
# ─────────────────────────────────────────────────────────────

GATEWAY=${1:-http://localhost:3001}

# Check k6 is installed
if ! command -v k6 &> /dev/null; then
  echo "❌ k6 is not installed."
  echo "   Mac:     brew install k6"
  echo "   Windows: https://k6.io/docs/getting-started/installation"
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  DEMO: DDoS Simulation"
echo "  Gateway: $GATEWAY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  What you'll see on the dashboard:"
echo "  1. Normal traffic (10 users) for 10 seconds"
echo "  2. Spike to 500 users — DDoS begins"
echo "  3. Rate limiting kicks in — 429s flood the feed"
echo "  4. IPs start getting auto-banned — 403s appear"
echo "  5. Slack alert fires"
echo "  6. Attack ends — traffic recovers"
echo ""
echo "  Open http://localhost:3000 now, then press Enter..."
read

k6 run \
  --env GATEWAY_URL="$GATEWAY" \
  tests/load/ddos-simulation.js

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Done. Check:"
echo "  • Dashboard → Threats tab for auto-banned IPs"
echo "  • Slack for threat alert notifications"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"