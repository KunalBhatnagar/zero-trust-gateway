// gateway/src/app.js

import 'dotenv/config';
import express, { json } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import forwardProxy from './proxy/forward.js';

const app = express();
const httpServer = createServer(app);

// Socket.IO setup (used later in Phase 8)
const io = new Server(httpServer, {
  cors: { origin: process.env.DASHBOARD_URL || 'http://localhost:3000' }
});

// Make io accessible to all middleware via req
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Basic security headers
app.use(helmet());
app.use(cors());
app.use(json());

// Health check (no auth needed)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/admin', require('./routes/keys'));
// ----- MIDDLEWARE CHAIN (added phase by phase) -----
// Phase 4: app.use(require('./middleware/ipCheck'))

// Phase 4: app.use(require('./middleware/auth'))
app.use(require('./middleware/auth'));
// Phase 5: app.use(require('./middleware/rateLimit'))
// Phase 6: app.use(require('./middleware/geoBlock'))

// Phase 3: Proxy (forward to upstream)
app.use(forwardProxy);

export { app, httpServer, io };