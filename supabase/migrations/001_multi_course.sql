-- Migration: Multi-course support
-- Run this in the Supabase SQL editor (Dashboard > SQL Editor)

-- 1. Add course_id to progress (default to existing course so no data is lost)
ALTER TABLE progress
  ADD COLUMN IF NOT EXISTS course_id text NOT NULL DEFAULT 'promptpath-starter';

-- 2. Drop old unique constraint (user_id + topic_id) and add new one (user_id + course_id + topic_id)
ALTER TABLE progress
  DROP CONSTRAINT IF EXISTS progress_user_id_topic_id_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'progress_user_id_course_id_topic_id_key'
  ) THEN
    ALTER TABLE progress
      ADD CONSTRAINT progress_user_id_course_id_topic_id_key
      UNIQUE (user_id, course_id, topic_id);
  END IF;
END $$;

-- 3. Enrollments table — tracks which courses a user has enrolled in
CREATE TABLE IF NOT EXISTS enrollments (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id     text NOT NULL,
  enrolled_at   timestamptz DEFAULT now() NOT NULL,
  completed_at  timestamptz,
  UNIQUE (user_id, course_id)
);

-- 4. Backfill enrollments for any user who already has progress
INSERT INTO enrollments (user_id, course_id, enrolled_at)
SELECT DISTINCT user_id, 'promptpath-starter', COALESCE(MIN(completed_at), now())
FROM progress
GROUP BY user_id
ON CONFLICT DO NOTHING;

-- 5. Milestone progress table — tracks project milestone completion
CREATE TABLE IF NOT EXISTS milestone_progress (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id    text NOT NULL,
  milestone_id text NOT NULL,
  status       text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  score        int NOT NULL DEFAULT 0,
  attempts     int NOT NULL DEFAULT 0,
  completed_at timestamptz,
  UNIQUE (user_id, course_id, milestone_id)
);

-- 6. Certificates table — issued when all topics + all milestones are complete
CREATE TABLE IF NOT EXISTS certificates (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  certificate_id text UNIQUE NOT NULL,
  user_id        uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id      text NOT NULL,
  issued_at      timestamptz DEFAULT now() NOT NULL,
  UNIQUE (user_id, course_id)
);

-- 7. RLS policies for new tables (mirror existing progress table pattern)
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='enrollments' AND policyname='Users can view own enrollments') THEN
    CREATE POLICY "Users can view own enrollments" ON enrollments FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='enrollments' AND policyname='Users can insert own enrollments') THEN
    CREATE POLICY "Users can insert own enrollments" ON enrollments FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='enrollments' AND policyname='Users can update own enrollments') THEN
    CREATE POLICY "Users can update own enrollments" ON enrollments FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='milestone_progress' AND policyname='Users can view own milestone progress') THEN
    CREATE POLICY "Users can view own milestone progress" ON milestone_progress FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='milestone_progress' AND policyname='Users can insert own milestone progress') THEN
    CREATE POLICY "Users can insert own milestone progress" ON milestone_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='milestone_progress' AND policyname='Users can update own milestone progress') THEN
    CREATE POLICY "Users can update own milestone progress" ON milestone_progress FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='certificates' AND policyname='Anyone can view certificates (for verification)') THEN
    CREATE POLICY "Anyone can view certificates (for verification)" ON certificates FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='certificates' AND policyname='Users can insert own certificates') THEN
    CREATE POLICY "Users can insert own certificates" ON certificates FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
