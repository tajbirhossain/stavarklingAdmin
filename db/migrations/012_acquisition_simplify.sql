-- Simplify the private acquisition request to match the agreed process:
-- one request, an optional message, everything else handled privately offline.
-- Run in the Supabase SQL Editor after 011. Safe to re-run.
-- Run it before deploying the matching code. Any answers in the dropped
-- columns are discarded.

ALTER TABLE acquisition_enquiries
  ADD COLUMN IF NOT EXISTS message TEXT;

ALTER TABLE acquisition_enquiries
  DROP CONSTRAINT IF EXISTS acquisition_enquiries_message_len;
ALTER TABLE acquisition_enquiries
  ADD CONSTRAINT acquisition_enquiries_message_len
    CHECK (message IS NULL OR char_length(message) <= 2000);

ALTER TABLE acquisition_enquiries
  DROP COLUMN IF EXISTS place_answer,
  DROP COLUMN IF EXISTS draw_answer,
  DROP COLUMN IF EXISTS contact_method,
  DROP COLUMN IF EXISTS contact_detail,
  DROP COLUMN IF EXISTS best_time;

-- Remaining statuses: received -> in_conversation -> completed (or closed).
UPDATE acquisition_enquiries
  SET status = 'in_conversation'
  WHERE status IN ('handover_open', 'handover_submitted');

ALTER TABLE acquisition_enquiries
  DROP CONSTRAINT IF EXISTS acquisition_enquiries_status;
ALTER TABLE acquisition_enquiries
  ADD CONSTRAINT acquisition_enquiries_status
    CHECK (status IN ('received', 'in_conversation', 'completed', 'closed'));
