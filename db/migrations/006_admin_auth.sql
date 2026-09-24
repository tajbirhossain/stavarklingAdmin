-- Mirror of stavarkling/db/migrations/006_admin_auth.sql
-- Keep both in sync when changing admin auth schema.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS admin_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL
    CONSTRAINT admin_accounts_username_len
      CHECK (char_length(btrim(username)) BETWEEN 2 AND 64),
  password_hash TEXT NOT NULL
    CONSTRAINT admin_accounts_password_hash_len
      CHECK (char_length(password_hash) BETWEEN 40 AND 512),
  failed_login_count SMALLINT NOT NULL DEFAULT 0
    CONSTRAINT admin_accounts_failed_login_count_range
      CHECK (failed_login_count >= 0 AND failed_login_count <= 100),
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT admin_accounts_username_unique UNIQUE (username)
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL
    REFERENCES admin_accounts (id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  request_ip INET,
  user_agent TEXT,
  CONSTRAINT admin_sessions_token_hash_unique UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS admin_sessions_admin_idx
  ON admin_sessions (admin_id);

CREATE INDEX IF NOT EXISTS admin_sessions_active_idx
  ON admin_sessions (token_hash, expires_at)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS admin_idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL
    REFERENCES admin_accounts (id) ON DELETE CASCADE,
  route TEXT NOT NULL
    CONSTRAINT admin_idempotency_route_len
      CHECK (char_length(route) BETWEEN 1 AND 200),
  idempotency_key TEXT NOT NULL
    CONSTRAINT admin_idempotency_key_len
      CHECK (char_length(idempotency_key) BETWEEN 8 AND 128),
  request_hash TEXT NOT NULL,
  response_status INTEGER NOT NULL
    CONSTRAINT admin_idempotency_status_range
      CHECK (response_status BETWEEN 100 AND 599),
  response_body JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT admin_idempotency_unique
    UNIQUE (admin_id, route, idempotency_key)
);

CREATE INDEX IF NOT EXISTS admin_idempotency_created_idx
  ON admin_idempotency_keys (created_at DESC);

ALTER TABLE admin_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_idempotency_keys ENABLE ROW LEVEL SECURITY;
