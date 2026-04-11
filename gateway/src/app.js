require('dotenv').config();
import express, { json } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { initEmitter } from './events/emitter';

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
}, require('./routes/keys'), require('./routes/stats'));

// Gateway middleware chain
app.use(require('./middleware/logger'));   // logs every request, added Phase 8
app.use(require('./middleware/ipCheck'));
app.use(require('./middleware/auth'));
app.use(require('./middleware/rateLimit'));
app.use(require('./middleware/geoBlock'));

// Proxy to upstream
app.use(require('./proxy/forward'));

export default { app, httpServer, io };