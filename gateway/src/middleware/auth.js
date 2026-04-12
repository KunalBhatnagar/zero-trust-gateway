// gateway/src/middleware/auth.js

import jwt from 'jsonwebtoken';
const { verify } = jwt;
import { query } from '../db/postgres.js';
import { hashKey } from '../utils/hash.js';

export default async function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  const apiKeyHeader = req.headers['x-api-key'];

  // --- Path 1: JWT Auth (user-facing clients) ---
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];

    try {
      const payload = verify(token, process.env.JWT_SECRET);
      req.client = {
        type: 'jwt',
        userId: payload.userId,
        role: payload.role,
        scopes: payload.scopes || []
      };
      return next();

    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'TOKEN_EXPIRED' });
      }
      return res.status(401).json({ error: 'INVALID_TOKEN' });
    }
  }

  // --- Path 2: API Key Auth (server-to-server) ---
  if (apiKeyHeader) {
    const keyHash = hashKey(apiKeyHeader);

    const result = await query(
      `SELECT * FROM api_keys 
       WHERE key_hash = $1 AND is_active = true AND revoked_at IS NULL`,
      [keyHash]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'INVALID_API_KEY' });
    }

    const apiKey = result.rows[0];
    req.client = {
      type: 'api_key',
      clientId: apiKey.id,
      clientName: apiKey.client_name,
      scopes: apiKey.scopes,
      rateLimit: apiKey.rate_limit_per_min
    };
    return next();
  }

  // --- No auth provided ---
  return res.status(401).json({ error: 'MISSING_AUTH' });
};