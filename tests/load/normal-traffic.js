import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate    = new Rate('error_rate');
const gatewayLatency = new Trend('gateway_latency');

export const options = {
  vus:      50,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<100'],  // 95% of requests under 100ms
    error_rate:        ['rate<0.05'],  // less than 5% errors
  },
};

const BASE  = __ENV.GATEWAY_URL || 'http://localhost:3001';
const TOKEN = __ENV.JWT_TOKEN   || 'test_token';

const ENDPOINTS = ['/api/users', '/api/products', '/api/orders'];

export default function () {
  const endpoint = ENDPOINTS[Math.floor(Math.random() * ENDPOINTS.length)];

  const res = http.get(`${BASE}${endpoint}`, {
    headers: { Authorization: `Bearer ${TOKEN}` }
  });

  const ok = check(res, {
    'not a 500 error':     r => r.status < 500,
    'response under 100ms': r => r.timings.duration < 100,
  });

  errorRate.add(!ok);
  gatewayLatency.add(res.timings.duration);

  sleep(0.1);
}

export function handleSummary(data) {
  const d  = data.metrics.http_req_duration.values;
  const rps = data.metrics.http_reqs.values.rate;

  console.log(`
╔══════════════════════════════════════╗
║     NORMAL TRAFFIC — RESULTS         ║
╠══════════════════════════════════════╣
║ Total Requests : ${String(data.metrics.http_reqs.values.count).padEnd(19)}║
║ Throughput     : ${String(rps.toFixed(1) + ' req/s').padEnd(19)}║
║ Avg Latency    : ${String(d.avg.toFixed(1) + 'ms').padEnd(19)}║
║ p95 Latency    : ${String(d['p(95)'].toFixed(1) + 'ms').padEnd(19)}║
║ Max Latency    : ${String(d.max.toFixed(1) + 'ms').padEnd(19)}║
╚══════════════════════════════════════╝
  `);

  return {
    'results/normal-traffic.json': JSON.stringify(data, null, 2)
  };
}