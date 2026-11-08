-- Private acquisition conversation (stage 3). One enquiry per application.
-- Run in the Supabase SQL Editor. Safe to re-run.

CREATE TABLE IF NOT EXISTS acquisition_enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL
    REFERENCES access_applications (id) ON DELETE CASCADE,
  place_answer TEXT NOT NULL
    CONSTRAINT acquisition_enquiries_place_len
      CHECK (char_length(btrim(place_answer)) BETWEEN 1 AND 2000),
  draw_answer TEXT
    CONSTRAINT acquisition_enquiries_draw_len
      CHECK (draw_answer IS NULL OR char_length(draw_answer) <= 2000),
  contact_method TEXT NOT NULL DEFAULT 'email'
    CONSTRAINT acquisition_enquiries_contact_method
      CHECK (contact_method IN ('email', 'phone', 'video')),
  contact_detail TEXT
    CONSTRAINT acquisition_enquiries_contact_detail_len
      CHECK (contact_detail IS NULL OR char_length(contact_detail) <= 200),
  best_time TEXT
    CONSTRAINT acquisition_enquiries_best_time_len
      CHECK (best_time IS NULL OR char_length(best_time) <= 200),
  status TEXT NOT NULL DEFAULT 'received'
    CONSTRAINT acquisition_enquiries_status
      CHECK (status IN ('received', 'in_conversation', 'handover_open',
                        'handover_submitted', 'completed', 'closed')),
  replied_at TIMESTAMPTZ,
  client_ip INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT acquisition_enquiries_application_unique UNIQUE (application_id)
);

CREATE INDEX IF NOT EXISTS acquisition_enquiries_status_idx
  ON acquisition_enquiries (status, created_at DESC);

CREATE OR REPLACE FUNCTION set_acquisition_enquiries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS acquisition_enquiries_set_updated_at ON acquisition_enquiries;
CREATE TRIGGER acquisition_enquiries_set_updated_at
  BEFORE UPDATE ON acquisition_enquiries
  FOR EACH ROW EXECUTE FUNCTION set_acquisition_enquiries_updated_at();

-- Server-side only (DATABASE_URL bypasses RLS). No anon policies by design.
ALTER TABLE acquisition_enquiries ENABLE ROW LEVEL SECURITY;
