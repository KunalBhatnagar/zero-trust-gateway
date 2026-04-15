// gateway/src/db/redis.js

import { createClient } from 'redis';

const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redis.on('error', (err) => {
  console.error('❌ Redis error:', err.message);
});

redis.on('connect', () => {
  console.log('✅ Redis connected');
});

// Connect immediately
redis.connect();

export default redis;

export const zRemRangeByScore = (...args) => redis.zRemRangeByScore(...args);
export const zCard             = (...args) => redis.zCard(...args);
export const zAdd              = (...args) => redis.zAdd(...args);
export const expire            = (...args) => redis.expire(...args);
export const get               = (...args) => redis.get(...args);
export const set               = (...args) => redis.set(...args);
export const del               = (...args) => redis.del(...args);
export const keys              = (...args) => redis.keys(...args);
export const ttl               = (...args) => redis.ttl(...args);
export const zCount            = (...args) => redis.zCount(...args);