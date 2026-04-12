import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

const blocked = new Counter('requests_blocked');
const allowed = new Counter('requests_allowed');

export const options = {
  stages: [
    { duration: '10s', target: 10  },   // Normal baseline
    { duration: '5s',  target: 500 },   // DDoS ramp-up
    { duration: '15s', target: 500 },   // Sustained attack
    { duration: '5s',  target: 10  },   // Attack ends
    { duration: '10s', target: 10  },   // Recovery check
  ],
  thresholds: {
    // CRITICAL: gateway must never return 500 during an attack
    // It should return 429 (rate limited) or 403 (banned) — never crash
    http_req_failed: ['rate<0.01'],
  }
};

const BASE = __ENV.GATEWAY_URL || 'http://localhost:3001';

export default function () {
  const res = http.get(`${BASE}/api/users`);

  const handled = check(res, {
    'gateway did not crash (no 500)': r => r.status !== 500,
    'properly rate-limited or banned': r => [200, 401, 403, 429].includes(r.status),
  });

  if (res.status === 429 || res.status === 403) {
    blocked.add(1);
  } else {
    allowed.add(1);
  }
}

export function handleSummary(data) {
  const total   = data.metrics.http_reqs.values.count;
  const blk     = data.metrics.requests_blocked?.values?.count  || 0;
  const alw     = data.metrics.requests_allowed?.values?.count  || 0;
  const crashed = data.metrics.http_req_failed?.values?.passes  || 0;

  console.log(`
╔══════════════════════════════════════╗
║     DDoS SIMULATION — RESULTS        ║
╠══════════════════════════════════════╣
║ Total Requests : ${String(total).padEnd(19)}║
║ Blocked/429    : ${String(blk).padEnd(19)}║
║ Allowed        : ${String(alw).padEnd(19)}║
║ Gateway 500s   : ${String(crashed).padEnd(19)}║
╚══════════════════════════════════════╝
→ Gateway crashed: ${crashed > 0 ? '❌ YES' : '✅ NO'}
→ Watch dashboard: auto-bans should appear mid-test
  `);

  return {
    'results/ddos-simulation.json': JSON.stringify(data, null, 2)
  };
}