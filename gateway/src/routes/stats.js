import { Router } from 'express';
const router = Router();
import { query } from '../db/postgres';
import { keys as _keys, get, ttl as _ttl, del } from '../db/redis';

// Overall 24h stats
router.get('/stats', async (req, res) => {
  try {
    const [reqStats, threatStats, blockedKeys] = await Promise.all([
      query(`
        SELECT
          COUNT(*) AS total_requests,
          COUNT(CASE WHEN status_code >= 400 THEN 1 END) AS error_count,
          ROUND(AVG(response_time_ms)) AS avg_response_time,
          COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 hour' THEN 1 END) AS requests_last_hour
        FROM audit_logs
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `),
      query(`
        SELECT COUNT(*) AS total
        FROM threat_events
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `),
      _keys('blocklist:ip:*')
    ]);

    res.json({
      totalRequests:    parseInt(reqStats.rows[0].total_requests),
      errorCount:       parseInt(reqStats.rows[0].error_count),
      avgResponseTime:  parseInt(reqStats.rows[0].avg_response_time) || 0,
      requestsLastHour: parseInt(reqStats.rows[0].requests_last_hour),
      threatsToday:     parseInt(threatStats.rows[0].total),
      blockedIPs:       blockedKeys.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Requests per minute over the last hour (for the chart)
router.get('/requests/timeline', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        to_char(date_trunc('minute', created_at), 'HH24:MI') AS time,
        COUNT(*) AS count,
        COUNT(CASE WHEN status_code >= 400 THEN 1 END) AS errors
      FROM audit_logs
      WHERE created_at > NOW() - INTERVAL '1 hour'
      GROUP BY date_trunc('minute', created_at)
      ORDER BY date_trunc('minute', created_at) ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Recent threat events
router.get('/threats/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const result = await query(
      'SELECT * FROM threat_events ORDER BY created_at DESC LIMIT $1',
      [limit]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// All currently blocked IPs from Redis
router.get('/blocked', async (req, res) => {
  try {
    const keys = await _keys('blocklist:ip:*');
    const blocked = [];

    for (const key of keys) {
      const data  = await get(key);
      const ttl   = await _ttl(key);
      const ip    = key.replace('blocklist:ip:', '');
      blocked.push({ ip, ...(JSON.parse(data || '{}')), expiresIn: ttl });
    }

    res.json(blocked);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Unblock an IP
router.delete('/blocked/:ip', async (req, res) => {
  try {
    await del(`blocklist:ip:${req.params.ip}`);
    res.json({ message: `${req.params.ip} unblocked` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;