-- Migration: Course-scope badge IDs
-- Run this AFTER 001_multi_course.sql
-- Renames existing generic badge_type values to include the course ID.

-- chapter_N → chapter_promptpath-starter_N
UPDATE badges
SET badge_type = 'chapter_promptpath-starter_' || SUBSTRING(badge_type, 9)
WHERE badge_type ~ '^chapter_\d+$';

-- course_complete → course_complete_promptpath-starter
UPDATE badges
SET badge_type = 'course_complete_promptpath-starter'
WHERE badge_type = 'course_complete';

-- cert_promptpath-starter is already correct — no change needed.
-- first_lesson, halfway, perfect_quiz, first_try, streak_* — all global, no change needed.
