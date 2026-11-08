-- Coming-soon "notify me" signups (previously stored in a Google Sheet).
-- Run in the Supabase SQL Editor. Safe to re-run.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL
    CONSTRAINT newsletter_subscribers_email_len
      CHECK (char_length(btrim(email)) BETWEEN 3 AND 320),
  source TEXT NOT NULL DEFAULT 'Website',
  client_ip INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per email, case-insensitive.
CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_email_unique
  ON newsletter_subscribers (lower(btrim(email)));

CREATE INDEX IF NOT EXISTS newsletter_subscribers_created_at_idx
  ON newsletter_subscribers (created_at DESC);

-- Server-side only (DATABASE_URL bypasses RLS). No anon policies by design.
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
