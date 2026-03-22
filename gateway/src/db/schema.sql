-- gateway/src/db/schema.sql

-- API Keys table (clients that use the gateway)
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,     -- SHA256 of the actual key
  scopes TEXT[] DEFAULT '{}',        -- ["read:users", "write:payments"]
  rate_limit_per_min INT DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  revoked_at TIMESTAMP
);

-- Audit logs (every single request)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES api_keys(id),
  ip_address TEXT NOT NULL,
  method TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  status_code INT NOT NULL,
  response_time_ms INT,
  country_code TEXT,
  user_agent TEXT,
  blocked_reason TEXT,       -- null if allowed, "RATE_LIMIT" etc if blocked
  created_at TIMESTAMP DEFAULT NOW()
);

-- Threat events (detected attacks)
CREATE TABLE IF NOT EXISTS threat_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  client_id UUID REFERENCES api_keys(id),
  threat_type TEXT NOT NULL,   -- "DDOS", "CREDENTIAL_STUFFING", "SCANNING"
  severity TEXT NOT NULL,      -- "LOW", "MEDIUM", "HIGH", "CRITICAL"
  details JSONB,               -- extra context
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Blocked IPs (manual + auto bans)
CREATE TABLE IF NOT EXISTS blocked_ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  blocked_by TEXT DEFAULT 'system',  -- "system" or "admin"
  expires_at TIMESTAMP,              -- null = permanent
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_ip ON audit_logs(ip_address);
CREATE INDEX idx_audit_logs_client ON audit_logs(client_id);
CREATE INDEX idx_blocked_ips_address ON blocked_ips(ip_address);