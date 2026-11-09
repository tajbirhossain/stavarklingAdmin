-- Record when the collector's confirmation email was actually sent, so the
-- page only says "A confirmation has been sent" when it is true.
-- Run in the Supabase SQL Editor after 012. Safe to re-run.

ALTER TABLE acquisition_enquiries
  ADD COLUMN IF NOT EXISTS confirmation_sent_at TIMESTAMPTZ;
