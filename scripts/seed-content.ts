/**
 * Seed course content into Supabase.
 *
 * Populates three tables from curriculum.ts:
 *   - course_topic_content      (lesson markdown)
 *   - course_quiz_questions     (questions incl. correctIndex — never sent to client)
 *   - course_coding_tasks       (instructions, boilerplate, rubric, hints)
 *
 * Run order:
 *   1. Apply migration 021 in the Supabase SQL Editor
 *   2. npx tsx scripts/seed-content.ts
 *   3. node scripts/strip-content.mjs   (strips content from curriculum.ts)
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local
 * The service-role key bypasses RLS — never commit it.
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { courses } from '../src/data/curriculum'

config({ path: '.env.local' })

const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function seed() {
  console.log('Seeding course content tables…\n')

  let contentCount  = 0
  let quizCount     = 0
  let codingCount   = 0
  const errors: string[] = []

  for (const course of courses) {
    for (const chapter of course.chapters) {
      for (const topic of chapter.topics) {
        const ref = `${course.id}/${topic.id}`

        // ── Lesson content ────────────────────────────────────────────────
        if (topic.content) {
          const { error } = await supabase
            .from('course_topic_content')
            .upsert(
              { course_id: course.id, topic_id: topic.id, content: topic.content },
              { onConflict: 'course_id,topic_id' },
            )
          if (error) { errors.push(`content ${ref}: ${error.message}`) }
          else { console.log(`  ✓ content  ${ref}`); contentCount++ }
        }

        // ── Quiz questions ────────────────────────────────────────────────
        if (topic.quiz && topic.quiz.length > 0) {
          for (let i = 0; i < topic.quiz.length; i++) {
            const q = topic.quiz[i]
            const { error } = await supabase
              .from('course_quiz_questions')
              .upsert(
                {
                  course_id:      course.id,
                  topic_id:       topic.id,
                  question_index: i,
                  question:       q.question,
                  options:        q.options,
                  correct_index:  q.correctIndex,
                  explanation:    q.explanation,
                },
                { onConflict: 'course_id,topic_id,question_index' },
              )
            if (error) { errors.push(`quiz ${ref}[${i}]: ${error.message}`) }
            else { quizCount++ }
          }
          console.log(`  ✓ quiz     ${ref} (${topic.quiz.length} questions)`)
        }

        // ── Coding task ───────────────────────────────────────────────────
        if (topic.codingTask) {
          const { error } = await supabase
            .from('course_coding_tasks')
            .upsert(
              {
                course_id:    course.id,
                topic_id:     topic.id,
                instructions: topic.codingTask.instructions,
                boilerplate:  topic.codingTask.boilerplate,
                rubric:       topic.codingTask.rubric,
                hints:        topic.codingTask.hints,
              },
              { onConflict: 'course_id,topic_id' },
            )
          if (error) { errors.push(`coding ${ref}: ${error.message}`) }
          else { console.log(`  ✓ coding   ${ref}`); codingCount++ }
        }
      }
    }
  }

  console.log(`\nSeeded: ${contentCount} lesson texts, ${quizCount} quiz questions, ${codingCount} coding tasks.`)

  if (errors.length > 0) {
    console.error('\nErrors:')
    errors.forEach(e => console.error('  ✗', e))
    console.error('\nFix errors then rerun — all inserts are upserts.')
    process.exit(1)
  }

  console.log('\nNext step: node scripts/strip-content.mjs')
}

seed()
