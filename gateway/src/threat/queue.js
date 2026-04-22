// gateway/src/threat/queue.js

import { Queue } from 'bullmq';
const _redisUrl  = new URL(process.env.REDIS_URL || 'redis://redis:6379');
const connection = { host: _redisUrl.hostname, port: Number(_redisUrl.port) || 6379 };

const threatQueue = new Queue('threat-analysis', { connection });

export default threatQueue;

export const add = (...args) => threatQueue.add(...args);