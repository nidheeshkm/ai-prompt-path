-- Migration 015: Composite indexes for progress, milestone_progress, badges
--
-- Existing UNIQUE constraints already create B-tree indexes that cover the
-- primary (user_id, course_id, topic_id / milestone_id) lookup patterns.
-- These additional indexes target the three query shapes that filter on
-- `status` — a column not present in any existing index — which currently
-- cause the planner to do a prefix scan + in-memory filter.
--
-- Queries addressed:
--   A) COUNT progress WHERE user_id=? AND status='completed'
--      → first_lesson and halfway badge checks in awardTopicBadges()
--
--   B) SELECT topic_id FROM progress
--         WHERE user_id=? AND course_id=? AND status='completed'
--      → chapter and course completion checks in awardTopicBadges()
--         and checkCourseCompletion()
--
--   C) SELECT milestone_id FROM milestone_progress
--         WHERE user_id=? AND course_id=? AND status='completed'
--      → course completion check in checkCourseCompletion()
--
--   D) SELECT badge_type FROM badges WHERE user_id=?
--      → dashboard badge display
--      Already served by UNIQUE (user_id, badge_type) — no new index needed.

-- ── progress ──────────────────────────────────────────────────────────────────

-- (A) Total completed topic count across all courses for a user
CREATE INDEX IF NOT EXISTS idx_progress_user_status
  ON progress (user_id, status);

-- (B) Completed topics in a specific course — INCLUDE avoids a heap fetch
--     because the query only selects topic_id (already in the index)
CREATE INDEX IF NOT EXISTS idx_progress_user_course_status
  ON progress (user_id, course_id, status)
  INCLUDE (topic_id);

-- ── milestone_progress ────────────────────────────────────────────────────────

-- (C) Completed milestones in a specific course
CREATE INDEX IF NOT EXISTS idx_milestone_progress_user_course_status
  ON milestone_progress (user_id, course_id, status)
  INCLUDE (milestone_id);

-- ── badges ───────────────────────────────────────────────────────────────────
-- UNIQUE (user_id, badge_type) already exists and covers:
--   • SELECT badge_type WHERE user_id = ?      (prefix scan)
--   • UPSERT ON CONFLICT (user_id, badge_type) (constraint lookup)
-- No additional index is needed for the current query patterns.
--
-- Optional: chronological badge display (add only if you sort by earned_at)
-- CREATE INDEX IF NOT EXISTS idx_badges_user_earned
--   ON badges (user_id, earned_at DESC);
