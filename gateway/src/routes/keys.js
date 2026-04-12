// gateway/src/routes/keys.js
// Admin endpoints to issue, list, revoke API keys

import { Router } from 'express';
const router = Router();
import { query } from '../db/postgres.js';
import { hashKey, generateAPIKey } from '../utils/hash.js';

// Issue a new API key
router.post('/keys', async (req, res) => {
  const { clientName, scopes, rateLimitPerMin } = req.body;

  const rawKey = generateAPIKey();        // shown ONCE to the user
  const keyHash = hashKey(rawKey);        // stored in DB

  const result = await query(
    `INSERT INTO api_keys (client_name, key_hash, scopes, rate_limit_per_min)
     VALUES ($1, $2, $3, $4) RETURNING id, client_name, scopes, created_at`,
    [clientName, keyHash, scopes || [], rateLimitPerMin || 100]
  );

  res.json({
    message: 'API key created. Save this — it will not be shown again.',
    key: rawKey,                // raw key shown once
    client: result.rows[0]
  });
});

// List all API keys (without the actual key values)
router.get('/keys', async (req, res) => {
  const result = await query(
    `SELECT id, client_name, scopes, rate_limit_per_min, 
            is_active, created_at, revoked_at 
     FROM api_keys ORDER BY created_at DESC`
  );
  res.json(result.rows);
});

// Revoke a key
router.delete('/keys/:id', async (req, res) => {
  await query(
    `UPDATE api_keys SET is_active = false, revoked_at = NOW() WHERE id = $1`,
    [req.params.id]
  );
  res.json({ message: 'Key revoked successfully' });
});

export default router;