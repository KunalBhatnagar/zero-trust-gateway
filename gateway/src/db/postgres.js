// gateway/src/db/postgres.js

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ PostgreSQL connection failed:', err.message);
    process.exit(1);
  }
  console.log('✅ PostgreSQL connected');
  release();
});

export default pool;

export const query = (...args) => pool.query(...args);