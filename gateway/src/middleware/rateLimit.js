// gateway/src/middleware/rateLimit.js

import { zRemRangeByScore, zCard, zAdd, expire } from '../db/redis';

// Core sliding window function (exported so tests can use it directly)
async function slidingWindowCheck(clientId, limitPerMin) {
  const key = `ratelimit:${clientId}`;
  const now = Date.now();
  const windowStart = now - 60000; // 60 seconds ago

  // Remove requests outside the window
  await zRemRangeByScore(key, 0, windowStart);

  // Count requests still in window
  const count = await zCard(key);

  if (count >= limitPerMin) {
    return { allowed: false, count, limit: limitPerMin };
  }

  // Add this request to the window
  await zAdd(key, { score: now, value: `${now}-${Math.random()}` });
  await expire(key, 60);

  return { allowed: true, count: count + 1, limit: limitPerMin };
}

// Express middleware
export default async function rateLimitMiddleware(req, res, next) {
  const clientId = req.client?.clientId || req.client?.userId || req.ip;
  const limit = req.client?.rateLimit || 100; // default 100 req/min

  const result = await slidingWindowCheck(clientId, limit);

  // Always set these headers so clients know their status
  res.setHeader('X-RateLimit-Limit', result.limit);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, result.limit - result.count));
  res.setHeader('X-RateLimit-Reset', Math.ceil((Date.now() + 60000) / 1000));

  if (!result.allowed) {
    res.setHeader('Retry-After', 60);
    return res.status(429).json({
      error: 'RATE_LIMIT_EXCEEDED',
      message: `Limit of ${result.limit} requests/min exceeded. Retry after 60 seconds.`
    });
  }

  next();
};

const _slidingWindowCheck = slidingWindowCheck;
export { _slidingWindowCheck as slidingWindowCheck };