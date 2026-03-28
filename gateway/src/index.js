// gateway/src/index.js

import 'dotenv/config';

// Connect DB first, then start server
import './db/redis.js';
import './db/postgres.js';

import { httpServer } from './app.js';

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`🚀 Gateway running on port ${PORT}`);
  console.log(`📡 Proxying to: ${process.env.UPSTREAM_URL}`);
  console.log(`🌐 Dashboard: http://localhost:3000`);
});