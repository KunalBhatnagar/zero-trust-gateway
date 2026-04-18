# 🔐 Zero-Trust API Gateway

> A self-hostable, production-grade API security layer with real-time
> threat detection and a live observability dashboard.

![Tests](https://github.com/KunalBhatnagar/zero-trust-gateway/actions/workflows/test.yml/badge.svg)
![Docker](https://img.shields.io/badge/docker-ready-blue?logo=docker)
![Node](https://img.shields.io/badge/node-18+-green?logo=node.js)
![License](https://img.shields.io/badge/license-MIT-blue)

---


## ❓ What Problem Does This Solve?

Most teams protect their APIs with basic JWT auth at best. There is no
visibility into *who* is calling, *how often*, *from where*, and
*whether it looks malicious*. Enterprise solutions (Kong, Apigee) cost
thousands per month.

This is a self-hostable alternative that gives you:
- Cryptographic identity verification on every request
- Per-client rate limiting with a sliding window algorithm
- Real-time threat detection via background anomaly analysis
- A live dashboard showing every request as it happens

---

## ⚡ Quick Start (5 minutes)

**Requirements:** Docker Desktop, Node.js 18+

```bash
git clone https://github.com/KunalBhatnagar/zero-trust-gateway
cd zero-trust-gateway
cp .env.example .env          # fill in your secrets
docker compose up --build
# In a second terminal:
node scripts/seed-demo.js
open http://localhost:3000
```

---

## 🎮 Interactive Demos

With the stack running, open the dashboard then trigger these:

```bash
# Demo 1 — Watch rate limiting kick in live
./scripts/demo/demo-ratelimit.sh

# Demo 2 — Simulate a DDoS attack, watch auto-bans fire
./scripts/demo/demo-ddos.sh
```

---

## 🏗️ Architecture

```
Client Request
      │
      ▼
   Nginx
   (reverse proxy + connection limiting)
      │
      ▼
 Gateway Core  ──── middleware chain ────▶  Upstream API
 (Node/Express)                                  │
      │                                          │
      │  ipCheck   → Redis blocklist + AbuseIPDB │
      │  auth      → JWT + API key (PostgreSQL)  │
      │  rateLimit → Sliding window (Redis)      │
      │  geoBlock  → Country rules               │
      │                                          │
      │ fire-and-forget                          │
      ▼                                          │
  BullMQ Worker ◀──────────────────────────────-┘
      │
      ├── Anomaly detection
      ├── Auto-ban high severity IPs (Redis TTL)
      ├── Write threat events (PostgreSQL)
      └── Slack alert
            │
            ▼
    Next.js Dashboard
    Socket.IO live feed + Recharts
```

---

## 🛠️ Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Gateway core | Node.js + Express | Non-blocking I/O, ideal for proxying |
| Rate limiting | Redis sorted sets | Sub-millisecond per-request checks |
| Async jobs | BullMQ | Threat analysis without adding latency |
| Persistence | PostgreSQL | Audit logs, API keys, threat history |
| Dashboard | Next.js + Recharts | SSR + real-time charting |
| Real-time feed | Socket.IO | Live request stream to dashboard |
| Reverse proxy | Nginx | TLS termination, connection limits |
| Containers | Docker + Compose | One-command local + production setup |
| CI/CD | GitHub Actions | Auto-test + deploy on every push |
| Cloud | AWS EC2 (ca-central-1) | Canadian data residency |

---

## 🧪 Test Suite

```bash
cd gateway

# Unit tests — no Docker needed (mocked Redis/DB)
npm test

# Integration tests — needs Docker running
npm run test:integration

# Load tests (requires k6)
k6 run tests/load/normal-traffic.js        # baseline perf
k6 run tests/load/ddos-simulation.js       # DDoS resilience
k6 run tests/load/credential-stuffing.js   # auth abuse
```

---

## 🔑 Key Design Decisions

**Sliding window rate limiting** over fixed windows eliminates the
edge case where a client doubles their quota by timing requests around
a reset boundary.

**BullMQ async threat processing** — threat analysis never blocks the
request path. Gateway adds ~5ms latency; analysis runs in the
background after the response is sent.

**Hot/cold data separation** — Redis holds rate limit counters and
active bans (microsecond reads). PostgreSQL holds audit history and
API keys (durability + complex queries).

**Redis TTL for auto-expiring bans** — bans self-expire after 24
hours with no cron job or manual cleanup needed.

---

## 📁 Project Structure

```
zero-trust-gateway/
├── gateway/              # Node.js core
│   ├── src/
│   │   ├── middleware/   # auth, rateLimit, ipCheck, geoBlock
│   │   ├── proxy/        # request forwarding
│   │   ├── threat/       # BullMQ queue + worker + detector
│   │   ├── events/       # Socket.IO emitter
│   │   ├── db/           # Redis + PostgreSQL clients
│   │   └── routes/       # admin API (keys, stats, blocks)
│   └── tests/
│       ├── unit/         # Jest unit tests
│       └── integration/  # Supertest integration tests
├── dashboard/            # Next.js frontend
├── tests/load/           # k6 load test scripts
├── scripts/              # seed data + demo scripts
├── nginx/                # reverse proxy config
└── docker-compose.yml
```

---

## 🚀 Deploy Your Own

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full AWS deployment guide.

```bash
# One-command production deploy on EC2
git clone https://github.com/KunalBhatnagar/zero-trust-gateway
cd zero-trust-gateway
cp .env.example .env   # fill in production secrets
docker compose up -d
node scripts/seed-demo.js
```

---

## 📄 License

Kunal Bhatnagar