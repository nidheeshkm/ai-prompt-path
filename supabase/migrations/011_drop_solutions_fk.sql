-- Migration 011: Drop FK constraints from solutions tables
--
-- content_solutions and content_milestone_solutions are admin-only tables
-- (zero RLS SELECT policies). Their FK to content_topics / content_milestones
-- blocks seeding until the full Phase-2 content migration populates those
-- parent tables. Since solutions are never joined via the FK anyway (only
-- looked up by course_id + topic_id / milestone_id), drop the constraints.

ALTER TABLE content_solutions
  DROP CONSTRAINT IF EXISTS content_solutions_course_id_topic_id_fkey;

ALTER TABLE content_milestone_solutions
  DROP CONSTRAINT IF EXISTS content_milestone_solutions_course_id_milestone_id_fkey;
