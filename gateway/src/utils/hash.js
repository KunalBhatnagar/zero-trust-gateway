// gateway/src/utils/hash.js

import { createHash, randomBytes } from 'crypto';

// Hash an API key before storing in DB
function hashKey(rawKey) {
  return createHash('sha256').update(rawKey).digest('hex');
}

// Generate a new random API key
function generateAPIKey() {
  return 'sk_live_' + randomBytes(24).toString('hex');
}

export default { hashKey, generateAPIKey };