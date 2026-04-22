// gateway/src/threat/queue.js

import { Queue } from 'bullmq';

let _queue = null;

function getQueue() {
  if (!_queue) {
    const url = new URL(process.env.REDIS_URL || 'redis://redis:6379');
    const connection = { host: url.hostname, port: Number(url.port) || 6379 };
    _queue = new Queue('threat-analysis', { connection });
  }
  return _queue;
}

export const add  = (...args) => getQueue().add(...args);
export const close = ()       => _queue?.close();