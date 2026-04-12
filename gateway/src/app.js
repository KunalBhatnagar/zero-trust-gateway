// gateway/src/app.js

import 'dotenv/config';
import express, { json } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { initEmitter } from './events/emitter.js';
import keysRouter from './routes/keys.js';
import statsRouter from './routes/stats.js';
import loggerMiddleware from './middleware/logger.js';
import ipCheckMiddleware from './middleware/ipCheck.js';
import authMiddleware from './middleware/auth.js';
import rateLimitMiddleware from './middleware/rateLimit.js';
import geoBlockMiddleware from './middleware/geoBlock.js';
import forwardProxy from './proxy/forward.js';

const app        = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: process.env.DASHBOARD_URL || 'http://localhost:3000' }
});

// Make io available to middleware
app.use((req, res, next) => { req.io = io; next(); });

// Initialize Socket.IO emitter
initEmitter(io);

app.use(helmet());
app.use(cors());
app.use(json());

// Health check — no auth
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Admin routes — protected by simple key check, NOT the gateway auth middleware
app.use('/admin', (req, res, next) => {
  if (req.headers['x-admin-key'] !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }
  next();
}, keysRouter, statsRouter);

// Gateway middleware chain
app.use(loggerMiddleware);
app.use(ipCheckMiddleware);
app.use(authMiddleware);
app.use(rateLimitMiddleware);
app.use(geoBlockMiddleware);

// Proxy to upstream
app.use(forwardProxy);

export { app, httpServer, io };
