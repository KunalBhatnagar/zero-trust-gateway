// gateway/src/middleware/ipCheck.js

import { get, set } from '../db/redis.js';
import pool from '../db/postgres.js';

// Cache AbuseIPDB results in Redis to avoid calling their API on every request
const ABUSEIPDB_CACHE_TTL = 86400; // 24 hours

async function checkAbuseIPDB(ip) {
  const cacheKey = `abuseipdb:${ip}`;
  const cached = await get(cacheKey);

  if (cached) return JSON.parse(cached);

  // Only call real API if key is configured
  if (!process.env.ABUSEIPDB_KEY || process.env.ABUSEIPDB_KEY === 'demo_mode') {
    return { score: 0 }; // demo mode skips API call
  }

  const response = await fetch(
    `https://api.abuseipdb.com/api/v2/check?ipAddress=${ip}&maxAgeInDays=90`,
    { headers: { Key: process.env.ABUSEIPDB_KEY, Accept: 'application/json' } }
  );

  const data = await response.json();
  const result = { score: data.data?.abuseConfidenceScore || 0 };

  // Cache for 24 hours
  await set(cacheKey, JSON.stringify(result), { EX: ABUSEIPDB_CACHE_TTL });
  return result;
}

export default async function ipCheckMiddleware(req, res, next) {
  const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0] || '0.0.0.0';
  req.clientIP = ip;

  // Check 1: Redis blocklist (fastest, < 1ms)
  const redisBlocked = await get(`blocklist:ip:${ip}`);
  if (redisBlocked) {
    return res.status(403).json({
      error: 'IP_BLOCKED',
      reason: JSON.parse(redisBlocked).reason
    });
  }

  // Check 2: AbuseIPDB score (cached in Redis)
  const { score } = await checkAbuseIPDB(ip);
  if (score > 80) {
    // Auto-block high confidence malicious IPs
    const banData = JSON.stringify({ reason: 'abuseipdb_high_score', score });
    await set(`blocklist:ip:${ip}`, banData, { EX: 86400 });

    return res.status(403).json({
      error: 'IP_BLOCKED',
      reason: 'Flagged by threat intelligence'
    });
  }

  next();
};