import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
dotenv.config({ path: fileURLToPath(new URL('../../.env.test', import.meta.url)) });
import request from 'supertest';
import jwt from 'jsonwebtoken';
const { sign } = jwt;

let app, httpServer, redis, pool, queue;

const SECRET = process.env.JWT_SECRET || 'integration_test_secret';

function token(payload = {}) {
  return sign(
    { userId: 'test_user', role: 'user', scopes: ['read:users'], ...payload },
    SECRET,
    { expiresIn: '1h' }
  );
}

beforeAll(async () => {
  process.env.JWT_SECRET    = SECRET;
  process.env.ADMIN_KEY     = 'test_admin_key';
  process.env.NODE_ENV      = 'test';

  const mod  = await import('../../src/app.js');
  app        = mod.app;
  httpServer = mod.httpServer;
  redis      = (await import('../../src/db/redis.js')).default;
  pool       = (await import('../../src/db/postgres.js')).default;
  queue      = await import('../../src/threat/queue.js');

  // Give connections time to establish
  await new Promise(r => setTimeout(r, 800));
});

afterAll(async () => {
  await redis.flushAll();
  await redis.quit();
  await pool.end();
  await queue.close();
  httpServer.close();
});

beforeEach(async () => {
  await redis.flushAll(); // clean Redis state between tests
});

// ─── Health ──────────────────────────────────────────────────────────────────

describe('Health Check', () => {
  test('GET /health returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });
});

// ─── Authentication ───────────────────────────────────────────────────────────

describe('Authentication middleware', () => {

  test('returns 401 MISSING_AUTH when no header provided', async () => {
    const res = await request(app).get('/api/anything');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('MISSING_AUTH');
  });

  test('returns 401 INVALID_TOKEN for a garbage token', async () => {
    const res = await request(app)
      .get('/api/anything')
      .set('Authorization', 'Bearer not.a.real.token');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('INVALID_TOKEN');
  });

  test('returns 401 TOKEN_EXPIRED for an expired token', async () => {
    const expired = sign({ userId: 'u_1' }, SECRET, { expiresIn: '1ms' });
    await new Promise(r => setTimeout(r, 50));

    const res = await request(app)
      .get('/api/anything')
      .set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('TOKEN_EXPIRED');
  });

});

// ─── Rate Limiting ────────────────────────────────────────────────────────────

describe('Rate limiting middleware', () => {

  test('response includes X-RateLimit headers', async () => {
    const t   = token({ userId: 'header_check_user' });
    const res = await request(app).get('/api/test').set('Authorization', `Bearer ${t}`);
    expect(res.headers['x-ratelimit-limit']).toBeDefined();
    expect(res.headers['x-ratelimit-remaining']).toBeDefined();
    expect(res.headers['x-ratelimit-reset']).toBeDefined();
  });

  test('returns 429 RATE_LIMIT_EXCEEDED after 100 requests', async () => {
    const t = token({ userId: 'rate_limit_user_999' });

    for (let i = 0; i < 100; i++) {
      await request(app).get('/api/test').set('Authorization', `Bearer ${t}`);
    }

    const res = await request(app).get('/api/test').set('Authorization', `Bearer ${t}`);
    expect(res.status).toBe(429);
    expect(res.body.error).toBe('RATE_LIMIT_EXCEEDED');
  });

  test('Retry-After header is present on 429', async () => {
    const t = token({ userId: 'retry_header_user' });

    for (let i = 0; i < 100; i++) {
      await request(app).get('/api/test').set('Authorization', `Bearer ${t}`);
    }

    const res = await request(app).get('/api/test').set('Authorization', `Bearer ${t}`);
    expect(res.status).toBe(429);
    expect(res.headers['retry-after']).toBeDefined();
  });

});

// ─── IP Blocking ─────────────────────────────────────────────────────────────

describe('IP blocking middleware', () => {

  test('returns 403 IP_BLOCKED for a blocklisted IP', async () => {
    await redis.set('blocklist:ip:9.9.9.9', JSON.stringify({ reason: 'test_ban' }));

    const res = await request(app)
      .get('/api/test')
      .set('X-Forwarded-For', '9.9.9.9');

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('IP_BLOCKED');
  });

  test('allows requests from clean IPs', async () => {
    // No ban set for this IP — health check needs no auth so we use that
    const res = await request(app)
      .get('/health')
      .set('X-Forwarded-For', '1.2.3.4');
    expect(res.status).toBe(200);
  });

});

// ─── Admin Routes ─────────────────────────────────────────────────────────────

describe('Admin routes', () => {

  test('returns 401 without admin key', async () => {
    const res = await request(app).get('/admin/keys');
    expect(res.status).toBe(401);
  });

  test('returns 200 with valid admin key', async () => {
    const res = await request(app)
      .get('/admin/keys')
      .set('x-admin-key', 'test_admin_key');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('can create and retrieve an API key', async () => {
    const create = await request(app)
      .post('/admin/keys')
      .set('x-admin-key', 'test_admin_key')
      .send({ clientName: 'Test Client', rateLimitPerMin: 60, scopes: ['read:users'] });

    expect(create.status).toBe(200);
    expect(create.body.key).toMatch(/^sk_live_/);

    const list = await request(app)
      .get('/admin/keys')
      .set('x-admin-key', 'test_admin_key');

    const found = list.body.find(k => k.client_name === 'Test Client');
    expect(found).toBeDefined();
    expect(found.rate_limit_per_min).toBe(60);
  });

});