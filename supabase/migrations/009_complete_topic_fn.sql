-- Migration 009: Atomic topic/milestone completion functions
--
-- Moves XP, streak, level, and progress writes into a single Postgres transaction.
-- The API routes call these via supabase.rpc() — the client never computes XP.
--
-- Streak multiplier thresholds and level XP thresholds are embedded here.
-- If you change them in src/lib/gamification.ts, update this file too.
-- Source of truth for thresholds: src/lib/gamification.ts

-- ── complete_topic_atomic ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION complete_topic_atomic(
  p_user_id    uuid,
  p_course_id  text,
  p_topic_id   text,
  p_score      int,
  p_submission jsonb,   -- pass null if no submission to store
  p_topic_xp   int      -- base XP from curriculum (passed by the API route)
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prof              RECORD;
  v_existing          RECORD;
  v_today             date    := current_date;
  v_yesterday         date    := current_date - 1;
  v_already_completed boolean := false;
  v_existing_score    int     := 0;
  v_existing_attempts int     := 0;
  v_new_attempts      int;
  v_new_streak        int;
  v_new_longest       int;
  v_multiplier        numeric;
  v_xp_earned         int     := 0;
  v_new_xp            int;
  v_new_level         int;
  v_is_new_best       boolean;
BEGIN
  -- Security: the calling user must match the target user
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Advisory lock scoped to (user × course × topic) — serialises concurrent
  -- submissions of the same topic from multiple tabs without locking other users.
  PERFORM pg_advisory_xact_lock(
    hashtext(p_user_id::text || '|' || p_course_id || '|' || p_topic_id)
  );

  -- Lock the profile row so concurrent calls for different topics still serialise
  -- on XP updates for the same user.
  SELECT xp, level, current_streak, longest_streak, last_activity_date
  INTO v_prof
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  -- Read existing progress (may not exist yet)
  SELECT status, score, attempts
  INTO v_existing
  FROM progress
  WHERE user_id = p_user_id AND course_id = p_course_id AND topic_id = p_topic_id;

  v_already_completed := FOUND AND v_existing.status = 'completed';
  v_existing_score    := COALESCE(v_existing.score, 0);
  v_existing_attempts := COALESCE(v_existing.attempts, 0);
  v_is_new_best       := p_score >= v_existing_score;

  -- Retakes don't increment the attempt counter (only first-pass attempts count).
  v_new_attempts := CASE WHEN v_already_completed THEN v_existing_attempts ELSE v_existing_attempts + 1 END;

  -- Streak (mirrors getStreakMultiplier logic in gamification.ts)
  IF v_prof.last_activity_date = v_today THEN
    -- Already visited today — no change
    v_new_streak  := COALESCE(v_prof.current_streak, 0);
    v_new_longest := COALESCE(v_prof.longest_streak, 0);
  ELSIF v_prof.last_activity_date = v_yesterday THEN
    -- Consecutive day
    v_new_streak  := COALESCE(v_prof.current_streak, 0) + 1;
    v_new_longest := GREATEST(COALESCE(v_prof.longest_streak, 0), v_new_streak);
  ELSE
    -- Gap or first ever activity
    v_new_streak  := 1;
    v_new_longest := GREATEST(COALESCE(v_prof.longest_streak, 0), 1);
  END IF;

  -- Upsert progress row
  INSERT INTO progress (user_id, course_id, topic_id, status, score, attempts, completed_at, submission)
  VALUES (
    p_user_id, p_course_id, p_topic_id,
    'completed', p_score, v_new_attempts, now(),
    CASE WHEN p_submission IS NOT NULL AND (NOT v_already_completed OR v_is_new_best) THEN p_submission ELSE NULL END
  )
  ON CONFLICT (user_id, course_id, topic_id) DO UPDATE SET
    status       = 'completed',
    score        = GREATEST(progress.score, EXCLUDED.score),
    attempts     = v_new_attempts,
    completed_at = now(),
    submission   = CASE
      WHEN p_submission IS NOT NULL AND v_is_new_best THEN p_submission
      ELSE progress.submission
    END;

  -- XP + level: only on first completion
  IF NOT v_already_completed THEN
    -- Streak multiplier (mirrors getStreakMultiplier in gamification.ts)
    v_multiplier := CASE
      WHEN v_new_streak >= 14 THEN 1.5
      WHEN v_new_streak >= 7  THEN 1.25
      WHEN v_new_streak >= 3  THEN 1.1
      ELSE 1.0
    END;

    v_xp_earned := ROUND(p_topic_xp * v_multiplier);
    v_new_xp    := COALESCE(v_prof.xp, 0) + v_xp_earned;

    -- Level thresholds (mirrors LEVELS array in gamification.ts)
    v_new_level := CASE
      WHEN v_new_xp >= 12350 THEN 10
      WHEN v_new_xp >= 10500 THEN 9
      WHEN v_new_xp >= 8500  THEN 8
      WHEN v_new_xp >= 6000  THEN 7
      WHEN v_new_xp >= 4000  THEN 6
      WHEN v_new_xp >= 2500  THEN 5
      WHEN v_new_xp >= 1500  THEN 4
      WHEN v_new_xp >= 750   THEN 3
      WHEN v_new_xp >= 300   THEN 2
      ELSE 1
    END;

    UPDATE profiles SET
      xp                 = v_new_xp,
      level              = v_new_level,
      current_streak     = v_new_streak,
      longest_streak     = v_new_longest,
      last_activity_date = v_today
    WHERE id = p_user_id;
  ELSE
    -- Retake: update streak + last_activity only, no XP
    v_new_xp    := COALESCE(v_prof.xp, 0);
    v_new_level := COALESCE(v_prof.level, 1);

    UPDATE profiles SET
      current_streak     = v_new_streak,
      longest_streak     = v_new_longest,
      last_activity_date = v_today
    WHERE id = p_user_id;
  END IF;

  RETURN jsonb_build_object(
    'already_completed',  v_already_completed,
    'xp_earned',          v_xp_earned,
    'new_xp',             v_new_xp,
    'new_level',          v_new_level,
    'new_streak',         v_new_streak,
    'new_longest_streak', v_new_longest,
    'attempts',           v_new_attempts
  );
END;
$$;

-- ── complete_milestone_atomic ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION complete_milestone_atomic(
  p_user_id      uuid,
  p_course_id    text,
  p_milestone_id text,
  p_score        int,
  p_milestone_xp int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prof              RECORD;
  v_existing          RECORD;
  v_today             date    := current_date;
  v_yesterday         date    := current_date - 1;
  v_already_completed boolean := false;
  v_existing_attempts int     := 0;
  v_new_attempts      int;
  v_new_streak        int;
  v_new_longest       int;
  v_multiplier        numeric;
  v_xp_earned         int     := 0;
  v_new_xp            int;
  v_new_level         int;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtext(p_user_id::text || '|' || p_course_id || '|milestone|' || p_milestone_id)
  );

  SELECT xp, level, current_streak, longest_streak, last_activity_date
  INTO v_prof
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  SELECT status, attempts
  INTO v_existing
  FROM milestone_progress
  WHERE user_id = p_user_id AND course_id = p_course_id AND milestone_id = p_milestone_id;

  v_already_completed := FOUND AND v_existing.status = 'completed';
  v_existing_attempts := COALESCE(v_existing.attempts, 0);
  v_new_attempts      := v_existing_attempts + 1;

  IF v_prof.last_activity_date = v_today THEN
    v_new_streak  := COALESCE(v_prof.current_streak, 0);
    v_new_longest := COALESCE(v_prof.longest_streak, 0);
  ELSIF v_prof.last_activity_date = v_yesterday THEN
    v_new_streak  := COALESCE(v_prof.current_streak, 0) + 1;
    v_new_longest := GREATEST(COALESCE(v_prof.longest_streak, 0), v_new_streak);
  ELSE
    v_new_streak  := 1;
    v_new_longest := GREATEST(COALESCE(v_prof.longest_streak, 0), 1);
  END IF;

  INSERT INTO milestone_progress (user_id, course_id, milestone_id, status, score, attempts, completed_at)
  VALUES (p_user_id, p_course_id, p_milestone_id, 'completed', p_score, v_new_attempts, now())
  ON CONFLICT (user_id, course_id, milestone_id) DO UPDATE SET
    status       = 'completed',
    score        = GREATEST(milestone_progress.score, EXCLUDED.score),
    attempts     = v_new_attempts,
    completed_at = now();

  IF NOT v_already_completed THEN
    v_multiplier := CASE
      WHEN v_new_streak >= 14 THEN 1.5
      WHEN v_new_streak >= 7  THEN 1.25
      WHEN v_new_streak >= 3  THEN 1.1
      ELSE 1.0
    END;

    v_xp_earned := ROUND(p_milestone_xp * v_multiplier);
    v_new_xp    := COALESCE(v_prof.xp, 0) + v_xp_earned;

    v_new_level := CASE
      WHEN v_new_xp >= 12350 THEN 10
      WHEN v_new_xp >= 10500 THEN 9
      WHEN v_new_xp >= 8500  THEN 8
      WHEN v_new_xp >= 6000  THEN 7
      WHEN v_new_xp >= 4000  THEN 6
      WHEN v_new_xp >= 2500  THEN 5
      WHEN v_new_xp >= 1500  THEN 4
      WHEN v_new_xp >= 750   THEN 3
      WHEN v_new_xp >= 300   THEN 2
      ELSE 1
    END;

    UPDATE profiles SET
      xp                 = v_new_xp,
      level              = v_new_level,
      current_streak     = v_new_streak,
      longest_streak     = v_new_longest,
      last_activity_date = v_today
    WHERE id = p_user_id;
  ELSE
    v_new_xp    := COALESCE(v_prof.xp, 0);
    v_new_level := COALESCE(v_prof.level, 1);

    UPDATE profiles SET
      current_streak     = v_new_streak,
      longest_streak     = v_new_longest,
      last_activity_date = v_today
    WHERE id = p_user_id;
  END IF;

  RETURN jsonb_build_object(
    'already_completed',  v_already_completed,
    'xp_earned',          v_xp_earned,
    'new_xp',             v_new_xp,
    'new_level',          v_new_level,
    'new_streak',         v_new_streak,
    'new_longest_streak', v_new_longest
  );
END;
$$;

-- ── Permissions ───────────────────────────────────────────────────────────────
-- Revoke from PUBLIC (which includes anon), grant only to authenticated users.

REVOKE EXECUTE ON FUNCTION complete_topic_atomic FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION complete_topic_atomic TO authenticated;

REVOKE EXECUTE ON FUNCTION complete_milestone_atomic FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION complete_milestone_atomic TO authenticated;
