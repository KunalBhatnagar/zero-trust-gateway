// gateway/src/middleware/logger.js
// Runs AFTER the proxy responds — captures everything

import { add } from '../threat/queue';
import { emitRequest } from '../events/emitter';

export default function loggerMiddleware(req, res, next) {
  const startTime = Date.now();

  // Hook into response finish event
  res.on('finish', async () => {
    const duration = Date.now() - startTime;

    const logEntry = {
      clientId: req.client?.clientId || null,
      ip: req.clientIP || req.ip,
      method: req.method,
      endpoint: req.path,
      statusCode: res.statusCode,
      responseTimeMs: duration,
      countryCode: req.countryCode || null,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString()
    };

    // 1. Emit to dashboard in real time
    emitRequest(logEntry);

    // 2. Push to BullMQ for async threat analysis + DB write
    await add('analyze', logEntry);
  });

  next();
};