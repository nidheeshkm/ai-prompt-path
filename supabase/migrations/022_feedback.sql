-- Migration 022: Feedback & Issue Reporting
--
-- Extends support_tickets to hold learner feedback and bug reports.
-- New columns: category, topic_id, course_id, screenshot_url, priority.
-- New status values: 'acknowledged', 'dismissed'.
-- New type values:   'feedback', 'bug'.
--
-- After applying this migration, create a private Supabase Storage bucket
-- named "feedback-screenshots" via the Supabase dashboard or CLI:
--   supabase storage buckets create feedback-screenshots --private

-- 1. Widen the status CHECK to include new values
ALTER TABLE support_tickets
  DROP CONSTRAINT IF EXISTS support_tickets_status_check;

ALTER TABLE support_tickets
  ADD CONSTRAINT support_tickets_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'acknowledged', 'dismissed'));

-- 2. Add feedback-specific columns (safe to add with nullable defaults)
ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS category      text,
  ADD COLUMN IF NOT EXISTS course_id     text,
  ADD COLUMN IF NOT EXISTS topic_id      text,
  ADD COLUMN IF NOT EXISTS screenshot_url text,
  ADD COLUMN IF NOT EXISTS priority      text NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high'));

-- 3. Index for fast admin queries: all open feedback/bugs, newest first
CREATE INDEX IF NOT EXISTS support_tickets_type_status_idx
  ON support_tickets (type, status, created_at DESC);

-- 4. Rate-limit helper view: submissions per user in the last 24 hours
--    Used by the API route to enforce max 5 feedback submissions per day.
CREATE OR REPLACE VIEW feedback_rate_limit AS
  SELECT
    user_id,
    COUNT(*) AS submissions_last_24h
  FROM support_tickets
  WHERE type IN ('feedback', 'bug')
    AND created_at > now() - interval '24 hours'
  GROUP BY user_id;

-- 5. RLS: users can read their own feedback submissions
--    (existing "users can read own tickets" policy already covers this)

-- 6. Admin policy: allow admins to read/update all tickets
--    (existing admin policies via createAdminClient bypass RLS — no change needed)
