// gateway/src/threat/worker.js

import { Worker } from 'bullmq';
import { zCount, get, set } from '../db/redis';
import { query } from '../db/postgres';
import { detectAnomaly } from './detector';
import { sendSlackAlert } from '../utils/alert';

const connection = { host: 'localhost', port: 6379 };

const worker = new Worker('threat-analysis', async (job) => {
  const { clientId, ip, endpoint, statusCode, timestamp } = job.data;

  // Get recent request stats for this client from Redis
  const requestsLastMin = await zCount(
    `ratelimit:${clientId}`,
    Date.now() - 60000,
    Date.now()
  );

  // Get 401 error rate
  const recentErrors = await get(`errors:401:${clientId}`);
  const errorRate401 = recentErrors ? parseInt(recentErrors) / requestsLastMin : 0;

  // Get baseline from DB (7-day average)
  const baselineResult = await query(
    `SELECT AVG(daily_requests) as avg_requests
     FROM (
       SELECT DATE(created_at), COUNT(*) as daily_requests
       FROM audit_logs
       WHERE client_id = $1 AND created_at > NOW() - INTERVAL '7 days'
       GROUP BY DATE(created_at)
     ) daily`,
    [clientId]
  );

  const baseline = {
    avgRequestsPerMin: (baselineResult.rows[0]?.avg_requests || 0) / 1440 // per minute
  };

  const current = { requestsLastMin, errorRate401LastMin: errorRate401 };
  const threat = detectAnomaly(baseline, current);

  if (threat.flagged) {
    // Save to threat_events table
    await query(
      `INSERT INTO threat_events (ip_address, client_id, threat_type, severity, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [ip, clientId, threat.reason, threat.severity, JSON.stringify(threat)]
    );

    // Auto-ban IP for CRITICAL/HIGH severity
    if (['CRITICAL', 'HIGH'].includes(threat.severity)) {
      await set(
        `blocklist:ip:${ip}`,
        JSON.stringify({ reason: threat.reason, autoban: true }),
        { EX: 86400 } // 24 hour ban
      );
    }

    // Send Slack alert
    await sendSlackAlert({
      type: threat.reason,
      severity: threat.severity,
      ip,
      clientId
    });
  }

  // Always log to audit table
  await query(
    `INSERT INTO audit_logs (client_id, ip_address, method, endpoint, status_code)
     VALUES ($1, $2, $3, $4, $5)`,
    [clientId, ip, job.data.method, endpoint, statusCode]
  );

}, { connection });

worker.on('completed', (job) => {
  console.log(`✅ Threat job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`❌ Threat job ${job.id} failed:`, err.message);
});

export default worker;