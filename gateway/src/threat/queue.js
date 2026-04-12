// gateway/src/threat/queue.js

import { Queue } from 'bullmq';
const connection = { host: 'localhost', port: 6379 };

const threatQueue = new Queue('threat-analysis', { connection });

export default threatQueue;

export const add = (...args) => threatQueue.add(...args);