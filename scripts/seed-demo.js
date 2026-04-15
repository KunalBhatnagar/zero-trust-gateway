import 'dotenv/config';

import { Pool } from 'pg';
import { createClient } from 'redis';
import { createHash, randomBytes } from 'crypto';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const pool  = new Pool({ connectionString: process.env.DATABASE_URL });
const redis = createClient({ url: process.env.REDIS_URL });

const rand   = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick   = arr => arr[Math.floor(Math.random() * arr.length)];
const hashKey = raw => createHash('sha256').update(raw).digest('hex');

async function seed() {
  await redis.connect();
  console.log('🌱 Seeding demo data...\n');

  // ── API Keys ──────────────────────────────────────────
  const clients = [
    { name: 'Mobile App',        limit: 100,  scopes: ['read:users', 'read:products'] },
    { name: 'Partner API',       limit: 500,  scopes: ['read:users', 'write:orders']  },
    { name: 'Internal Service',  limit: 1000, scopes: ['read:users', 'write:payments', 'admin'] },
  ];

  const seededClients = [];

  for (const c of clients) {
    const rawKey  = 'sk_live_' + randomBytes(24).toString('hex');
    const keyHash = hashKey(rawKey);

    const res = await pool.query(
      `INSERT INTO api_keys (client_name, key_hash, scopes, rate_limit_per_min)
       VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING RETURNING id`,
      [c.name, keyHash, c.scopes, c.limit]
    );

    if (res.rows[0]) {
      seededClients.push({ ...c, id: res.rows[0].id });
      console.log(`✅ API key for "${c.name}" → ${rawKey}`);
    }
  }

  // ── Audit Logs (7 days) ───────────────────────────────
  const endpoints   = ['/api/users', '/api/products', '/api/orders', '/api/payments', '/api/reports'];
  const methods     = ['GET', 'GET', 'GET', 'POST', 'PUT'];
  const statusCodes = [200, 200, 200, 200, 201, 400, 401, 404, 500];
  const countries   = ['CA', 'CA', 'CA', 'US', 'US', 'GB'];

  console.log('\n📊 Generating 7 days of audit logs (this takes ~30s)...');

  const now = Date.now();
  for (let day = 7; day >= 0; day--) {
    const count = rand(3000, 6000);

    // Insert in batches for speed
    const values = [];
    const params = [];
    let   pi     = 1;

    for (let i = 0; i < count; i++) {
      const ts     = new Date(now - day * 86400000 - rand(0, 86400000));
      const client = pick(seededClients);

      values.push(`($${pi++}, $${pi++}, $${pi++}, $${pi++}, $${pi++}, $${pi++}, $${pi++}, $${pi++})`);
      params.push(
        client?.id || null,
        `${rand(1,254)}.${rand(1,254)}.${rand(1,254)}.${rand(1,254)}`,
        pick(methods),
        pick(endpoints),
        pick(statusCodes),
        rand(2, 45),
        pick(countries),
        ts
      );
    }

    await pool.query(
      `INSERT INTO audit_logs
         (client_id, ip_address, method, endpoint, status_code, response_time_ms, country_code, created_at)
       VALUES ${values.join(',')}`,
      params
    );
    process.stdout.write(`Day -${day} (${count} logs) ✓\n`);
  }

  // ── Threat Events ─────────────────────────────────────
  console.log('\n🚨 Creating threat events...');
  const threats = [
    { type: 'DDOS_PATTERN',        severity: 'CRITICAL' },
    { type: 'CREDENTIAL_STUFFING', severity: 'HIGH'     },
    { type: 'TRAFFIC_SPIKE',       severity: 'HIGH'     },
    { type: 'ENDPOINT_SCANNING',   severity: 'MEDIUM'   },
    { type: 'OFF_HOURS_ACCESS',    severity: 'LOW'      },
  ];

  for (let i = 0; i < 15; i++) {
    const t = pick(threats);
    await pool.query(
      `INSERT INTO threat_events (ip_address, threat_type, severity, details, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        `${rand(1,254)}.${rand(1,254)}.${rand(1,254)}.${rand(1,254)}`,
        t.type,
        t.severity,
        JSON.stringify({ requestCount: rand(100, 2000), autoDetected: true }),
        new Date(now - rand(0, 6) * 86400000 - rand(0, 43200000))
      ]
    );
  }
  console.log('✅ 15 threat events created');

  // ── Blocked IPs in Redis ──────────────────────────────
  console.log('\n🚫 Adding blocked IPs to Redis...');
  const bannedIPs = [
    { ip: '1.2.3.4',     reason: 'ddos_pattern',        autoban: true  },
    { ip: '5.6.7.8',     reason: 'credential_stuffing',  autoban: true  },
    { ip: '10.20.30.40', reason: 'manual_ban',            autoban: false },
  ];

  for (const b of bannedIPs) {
    await redis.set(`blocklist:ip:${b.ip}`, JSON.stringify(b), { EX: 86400 });
    console.log(`  Blocked: ${b.ip} (${b.reason})`);
  }

  // ── Mock API DB ───────────────────────────────────────
  const mockDB = {
    users:    Array.from({ length: 15 }, (_, i) => ({ id: i+1, name: `User ${i+1}`, email: `user${i+1}@example.com` })),
    products: Array.from({ length: 8  }, (_, i) => ({ id: i+1, name: `Product ${i+1}`, price: rand(10, 500) })),
    orders:   Array.from({ length: 20 }, (_, i) => ({ id: i+1, userId: rand(1, 15), total: rand(20, 1000) })),
  };
  writeFileSync(
    join(__dirname, 'demo/mock-db.json'),
    JSON.stringify(mockDB, null, 2)
  );
  console.log('\n✅ Mock API database written');

  console.log('\n🎉 Seed complete! Open http://localhost:3000\n');

  await redis.quit();
  await pool.end();
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });