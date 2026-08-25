-- Migration 010: Course content schema
--
-- Moves all curriculum data from the TypeScript bundle into Supabase.
-- Designed for admin-panel management (future) and server-side solution access (now).
--
-- RLS strategy:
--   content_solutions / content_milestone_solutions — NO client access (not even SELECT).
--   All other content tables — authenticated users can SELECT.
--   Admin writes use the service-role key which bypasses RLS entirely.

-- ── Courses ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS content_courses (
  id               text PRIMARY KEY,
  title            text NOT NULL,
  tagline          text NOT NULL,
  description      text NOT NULL DEFAULT '',
  icon             text NOT NULL DEFAULT '',
  level            text NOT NULL DEFAULT 'beginner'
    CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  estimated_hours  int  NOT NULL DEFAULT 0,
  tags             text[] NOT NULL DEFAULT '{}',
  level_titles     text[] NOT NULL DEFAULT '{}',  -- 5 course-specific titles
  is_published     boolean NOT NULL DEFAULT false,
  sort_order       int  NOT NULL DEFAULT 0,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- ── Chapters ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS content_chapters (
  id          bigserial PRIMARY KEY,
  course_id   text NOT NULL REFERENCES content_courses(id) ON DELETE CASCADE,
  number      int  NOT NULL,
  title       text NOT NULL,
  description text NOT NULL DEFAULT '',
  part        text NOT NULL DEFAULT '',
  icon        text NOT NULL DEFAULT '',
  sort_order  int  NOT NULL DEFAULT 0,
  UNIQUE (course_id, number)
);

CREATE INDEX IF NOT EXISTS content_chapters_course ON content_chapters (course_id);

-- ── Topics ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS content_topics (
  id              text NOT NULL,
  chapter_id      bigint NOT NULL REFERENCES content_chapters(id) ON DELETE CASCADE,
  course_id       text   NOT NULL REFERENCES content_courses(id)  ON DELETE CASCADE,
  title           text NOT NULL,
  xp              int  NOT NULL DEFAULT 0,
  assessment_type text NOT NULL DEFAULT 'quiz'
    CHECK (assessment_type IN ('quiz', 'coding', 'mini-project')),
  sort_order      int  NOT NULL DEFAULT 0,
  PRIMARY KEY (course_id, id)
);

CREATE INDEX IF NOT EXISTS content_topics_chapter ON content_topics (chapter_id);
CREATE INDEX IF NOT EXISTS content_topics_course  ON content_topics (course_id);

-- ── Topic content (markdown) ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS content_topic_content (
  course_id text NOT NULL,
  topic_id  text NOT NULL,
  content   text NOT NULL DEFAULT '',
  PRIMARY KEY (course_id, topic_id),
  FOREIGN KEY (course_id, topic_id)
    REFERENCES content_topics(course_id, id) ON DELETE CASCADE
);

-- ── Quiz questions ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS content_quiz_questions (
  id            bigserial PRIMARY KEY,
  course_id     text NOT NULL,
  topic_id      text NOT NULL,
  sort_order    int  NOT NULL DEFAULT 0,
  question      text NOT NULL,
  options       text[] NOT NULL DEFAULT '{}',
  correct_index int  NOT NULL,
  explanation   text NOT NULL DEFAULT '',
  FOREIGN KEY (course_id, topic_id)
    REFERENCES content_topics(course_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS content_quiz_questions_topic
  ON content_quiz_questions (course_id, topic_id);

-- ── Coding tasks (client-safe — no solutionCode) ──────────────────────────────

CREATE TABLE IF NOT EXISTS content_coding_tasks (
  course_id    text NOT NULL,
  topic_id     text NOT NULL,
  instructions text NOT NULL DEFAULT '',
  boilerplate  text NOT NULL DEFAULT '',
  rubric       text[] NOT NULL DEFAULT '{}',
  hints        text[] NOT NULL DEFAULT '{}',
  PRIMARY KEY (course_id, topic_id),
  FOREIGN KEY (course_id, topic_id)
    REFERENCES content_topics(course_id, id) ON DELETE CASCADE
);

-- ── Solutions — SERVER-SIDE ONLY ──────────────────────────────────────────────
-- RLS: no SELECT for authenticated or anon roles.
-- Only the service-role key (used in /api/solution) bypasses RLS and can read this.

CREATE TABLE IF NOT EXISTS content_solutions (
  course_id     text NOT NULL,
  topic_id      text NOT NULL,
  solution_code text NOT NULL DEFAULT '',
  updated_at    timestamptz DEFAULT now(),
  PRIMARY KEY (course_id, topic_id),
  FOREIGN KEY (course_id, topic_id)
    REFERENCES content_topics(course_id, id) ON DELETE CASCADE
);

-- ── Projects + Milestones ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS content_projects (
  id          text NOT NULL,
  course_id   text NOT NULL REFERENCES content_courses(id) ON DELETE CASCADE,
  title       text NOT NULL,
  description text NOT NULL DEFAULT '',
  PRIMARY KEY (course_id, id)
);

CREATE TABLE IF NOT EXISTS content_milestones (
  id           text NOT NULL,
  course_id    text NOT NULL,
  project_id   text NOT NULL,
  title        text NOT NULL,
  xp           int  NOT NULL DEFAULT 0,
  instructions text NOT NULL DEFAULT '',
  boilerplate  text NOT NULL DEFAULT '',
  rubric       text[] NOT NULL DEFAULT '{}',
  hints        text[] NOT NULL DEFAULT '{}',
  sort_order   int  NOT NULL DEFAULT 0,
  PRIMARY KEY (course_id, id),
  FOREIGN KEY (course_id, project_id)
    REFERENCES content_projects(course_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS content_milestones_course ON content_milestones (course_id);

-- ── Milestone solutions — SERVER-SIDE ONLY ────────────────────────────────────

CREATE TABLE IF NOT EXISTS content_milestone_solutions (
  course_id     text NOT NULL,
  milestone_id  text NOT NULL,
  solution_code text NOT NULL DEFAULT '',
  updated_at    timestamptz DEFAULT now(),
  PRIMARY KEY (course_id, milestone_id),
  FOREIGN KEY (course_id, milestone_id)
    REFERENCES content_milestones(course_id, id) ON DELETE CASCADE
);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE content_courses              ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_chapters             ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_topics               ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_topic_content        ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_quiz_questions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_coding_tasks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_solutions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_projects             ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_milestones           ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_milestone_solutions  ENABLE ROW LEVEL SECURITY;

-- Public content: authenticated users can read everything except solutions
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='content_courses' AND policyname='authenticated_select') THEN
    CREATE POLICY authenticated_select ON content_courses    FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='content_chapters' AND policyname='authenticated_select') THEN
    CREATE POLICY authenticated_select ON content_chapters   FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='content_topics' AND policyname='authenticated_select') THEN
    CREATE POLICY authenticated_select ON content_topics     FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='content_topic_content' AND policyname='authenticated_select') THEN
    CREATE POLICY authenticated_select ON content_topic_content FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='content_quiz_questions' AND policyname='authenticated_select') THEN
    CREATE POLICY authenticated_select ON content_quiz_questions FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='content_coding_tasks' AND policyname='authenticated_select') THEN
    CREATE POLICY authenticated_select ON content_coding_tasks FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='content_projects' AND policyname='authenticated_select') THEN
    CREATE POLICY authenticated_select ON content_projects   FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='content_milestones' AND policyname='authenticated_select') THEN
    CREATE POLICY authenticated_select ON content_milestones FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- content_solutions and content_milestone_solutions: NO policies created.
-- With RLS enabled and zero policies, Postgres denies all access for
-- authenticated and anon roles. Only the service-role key bypasses RLS.
