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