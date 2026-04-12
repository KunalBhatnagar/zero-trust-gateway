import http from 'k6/http';
import { check } from 'k6';
import { Counter, Rate } from 'k6/metrics';

const autoBanned = new Counter('auto_banned');
const rejected   = new Rate('rejection_rate');

export const options = {
  vus:      20,
  duration: '30s',
};

const BASE = __ENV.GATEWAY_URL || 'http://localhost:3001';

// Simulate 500 stolen/invalid tokens
const STOLEN = Array.from(
  { length: 500 },
  (_, i) => `eyJhbGciOiJIUzI1NiJ9.stolen_cred_${i}.fakeSignature`
);

export default function () {
  const token = STOLEN[Math.floor(Math.random() * STOLEN.length)];

  const res = http.get(`${BASE}/api/users`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const ok = check(res, {
    'rejected (401 or 403)': r => r.status === 401 || r.status === 403,
    'not a server error':    r => r.status < 500,
  });

  rejected.add(res.status === 401 || res.status === 403);

  if (res.status === 403) {
    autoBanned.add(1); // IP was auto-banned after threshold
  }
}

export function handleSummary(data) {
  console.log(`
╔══════════════════════════════════════╗
║  CREDENTIAL STUFFING — RESULTS       ║
╠══════════════════════════════════════╣
║ Total Attempts : ${String(data.metrics.http_reqs.values.count).padEnd(19)}║
║ Auto-bans (403): ${String(data.metrics.auto_banned?.values?.count || 0).padEnd(19)}║
║ Avg Response   : ${String(data.metrics.http_req_duration.values.avg.toFixed(0) + 'ms').padEnd(19)}║
╚══════════════════════════════════════╝
→ Check your Slack — auto-ban alerts should have fired
  `);

  return {
    'results/credential-stuffing.json': JSON.stringify(data, null, 2)
  };
}