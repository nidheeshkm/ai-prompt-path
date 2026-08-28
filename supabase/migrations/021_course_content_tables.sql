-- Migration 021: Course content tables
--
-- Moves lesson text, quiz questions, and coding tasks out of the client bundle
-- and into the database. The client only receives question text and options —
-- correctIndex and explanation are kept server-side and never sent to the browser
-- until after the quiz is submitted and graded.
--
-- RLS: authenticated users can SELECT (to read their own lesson/quiz content).
--      Only the service-role key (bypassing RLS) may INSERT / UPDATE via the
--      seed script — no policy is created for writes so anon/authenticated users
--      cannot modify content.

-- ── Lesson content ──────────────────────────────────────────────────────────
create table if not exists course_topic_content (
  id         uuid primary key default gen_random_uuid(),
  course_id  text not null,
  topic_id   text not null,
  content    text not null default '',
  updated_at timestamptz not null default now(),
  unique (course_id, topic_id)
);

alter table course_topic_content enable row level security;

create policy "Authenticated users can read topic content"
  on course_topic_content for select
  to authenticated
  using (true);

-- ── Quiz questions ───────────────────────────────────────────────────────────
-- Each row is one question. question_index is 0-based within the topic.
-- correct_index and explanation are NEVER selected by the client-facing query;
-- they are only read by the server-side grading function.
create table if not exists course_quiz_questions (
  id             uuid primary key default gen_random_uuid(),
  course_id      text not null,
  topic_id       text not null,
  question_index int  not null,
  question       text not null,
  options        jsonb not null default '[]',
  correct_index  int  not null,
  explanation    text not null default '',
  updated_at     timestamptz not null default now(),
  unique (course_id, topic_id, question_index)
);

alter table course_quiz_questions enable row level security;

-- Clients may read question + options — intentionally exclude correct_index
-- and explanation via column-level restriction (enforced in server functions,
-- not here; RLS cannot restrict individual columns, so we rely on the query
-- in src/server/curriculum.ts never selecting those columns for clients).
create policy "Authenticated users can read quiz questions"
  on course_quiz_questions for select
  to authenticated
  using (true);

-- ── Coding tasks ─────────────────────────────────────────────────────────────
-- instructions / boilerplate / rubric / hints are not secret (shown to the user)
-- but we move them server-side to keep the client bundle thin.
-- solutionCode lives in content_solutions (migration 010) — not duplicated here.
create table if not exists course_coding_tasks (
  id           uuid primary key default gen_random_uuid(),
  course_id    text not null,
  topic_id     text not null,
  instructions text not null default '',
  boilerplate  text not null default '',
  rubric       jsonb not null default '[]',
  hints        jsonb not null default '[]',
  updated_at   timestamptz not null default now(),
  unique (course_id, topic_id)
);

alter table course_coding_tasks enable row level security;

create policy "Authenticated users can read coding tasks"
  on course_coding_tasks for select
  to authenticated
  using (true);

-- ── Indexes ──────────────────────────────────────────────────────────────────
create index if not exists idx_topic_content_lookup
  on course_topic_content (course_id, topic_id);

create index if not exists idx_quiz_questions_lookup
  on course_quiz_questions (course_id, topic_id, question_index);

create index if not exists idx_coding_tasks_lookup
  on course_coding_tasks (course_id, topic_id);
