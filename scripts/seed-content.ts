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
import {
  ch208Content, ch208Quiz, ch208CodingTask,
  ch209Content, ch209Quiz, ch209CodingTask,
  ch210Content, ch210Quiz, ch210CodingTask,
  ch211Content, ch211Quiz, ch211CodingTask,
  ch212Content, ch212Quiz, ch212CodingTask,
  courseId as sbCourseId,
} from './content/springboot-part3-index'
import {
  ch213Content, ch213Quiz, ch213CodingTask,
  ch214Content, ch214Quiz, ch214CodingTask,
  ch215Content, ch215Quiz, ch215CodingTask,
  ch216Content, ch216Quiz, ch216CodingTask,
} from './content/springboot-part4-index'
import {
  ch217Content, ch217Quiz, ch217CodingTask,
  ch218Content, ch218Quiz, ch218CodingTask,
  ch219Content, ch219Quiz, ch219CodingTask,
  ch220Content, ch220Quiz, ch220CodingTask,
} from './content/springboot-part5-index'
import {
  ch221Content, ch221Quiz, ch221CodingTask,
  ch222Content, ch222Quiz, ch222CodingTask,
  ch223Content, ch223Quiz, ch223CodingTask,
  ch224Content, ch224Quiz, ch224CodingTask,
} from './content/springboot-part6-index'
import {
  ch225Content, ch225Quiz, ch225CodingTask,
  ch226Content, ch226Quiz, ch226CodingTask,
  ch227Content, ch227Quiz, ch227CodingTask,
  ch228Content, ch228Quiz, ch228CodingTask,
} from './content/springboot-part7-index'
import {
  ch229Content, ch229Quiz, ch229CodingTask,
  ch230Content, ch230Quiz, ch230CodingTask,
  ch231Content, ch231Quiz, ch231CodingTask,
} from './content/springboot-part8-index'
import {
  ch232Content, ch232Quiz, ch232CodingTask,
  ch233Content, ch233Quiz, ch233CodingTask,
  ch234Content, ch234Quiz, ch234CodingTask,
} from './content/springboot-part9-index'
import {
  ch235Content, ch235Quiz, ch235CodingTask,
  ch236Content, ch236Quiz, ch236CodingTask,
  ch237Content, ch237Quiz, ch237CodingTask,
} from './content/springboot-part10-index'

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

  // ── Part III content files (springboot-ai-architect chapters 208-212) ────────
  const allContent   = { ...ch208Content, ...ch209Content, ...ch210Content, ...ch211Content, ...ch212Content,
                         ...ch213Content, ...ch214Content, ...ch215Content, ...ch216Content,
                         ...ch217Content, ...ch218Content, ...ch219Content, ...ch220Content,
                         ...ch221Content, ...ch222Content, ...ch223Content, ...ch224Content,
                         ...ch225Content, ...ch226Content, ...ch227Content, ...ch228Content,
                         ...ch229Content, ...ch230Content, ...ch231Content,
                         ...ch232Content, ...ch233Content, ...ch234Content,
                         ...ch235Content, ...ch236Content, ...ch237Content }
  const allQuiz      = { ...ch208Quiz,    ...ch209Quiz,    ...ch210Quiz,    ...ch211Quiz,    ...ch212Quiz,
                         ...ch213Quiz,    ...ch214Quiz,    ...ch215Quiz,    ...ch216Quiz,
                         ...ch217Quiz,    ...ch218Quiz,    ...ch219Quiz,    ...ch220Quiz,
                         ...ch221Quiz,    ...ch222Quiz,    ...ch223Quiz,    ...ch224Quiz,
                         ...ch225Quiz,    ...ch226Quiz,    ...ch227Quiz,    ...ch228Quiz,
                         ...ch229Quiz,    ...ch230Quiz,    ...ch231Quiz,
                         ...ch232Quiz,    ...ch233Quiz,    ...ch234Quiz,
                         ...ch235Quiz,    ...ch236Quiz,    ...ch237Quiz }
  const allCoding    = { ...ch208CodingTask, ...ch209CodingTask, ...ch210CodingTask, ...ch211CodingTask, ...ch212CodingTask,
                         ...ch213CodingTask, ...ch214CodingTask, ...ch215CodingTask, ...ch216CodingTask,
                         ...ch217CodingTask, ...ch218CodingTask, ...ch219CodingTask, ...ch220CodingTask,
                         ...ch221CodingTask, ...ch222CodingTask, ...ch223CodingTask, ...ch224CodingTask,
                         ...ch225CodingTask, ...ch226CodingTask, ...ch227CodingTask, ...ch228CodingTask,
                         ...ch229CodingTask, ...ch230CodingTask, ...ch231CodingTask,
                         ...ch232CodingTask, ...ch233CodingTask, ...ch234CodingTask,
                         ...ch235CodingTask, ...ch236CodingTask, ...ch237CodingTask }

  for (const [topicId, content] of Object.entries(allContent)) {
    const { error } = await supabase.from('course_topic_content').upsert(
      { course_id: sbCourseId, topic_id: topicId, content },
      { onConflict: 'course_id,topic_id' },
    )
    if (error) { errors.push(`content ${sbCourseId}/${topicId}: ${error.message}`) }
    else { console.log(`  ✓ content  ${sbCourseId}/${topicId}`); contentCount++ }
  }

  for (const [topicId, questions] of Object.entries(allQuiz)) {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      const { error } = await supabase.from('course_quiz_questions').upsert(
        { course_id: sbCourseId, topic_id: topicId, question_index: i,
          question: q.question, options: q.options, correct_index: q.correctIndex, explanation: q.explanation },
        { onConflict: 'course_id,topic_id,question_index' },
      )
      if (error) errors.push(`quiz ${sbCourseId}/${topicId}[${i}]: ${error.message}`)
      else quizCount++
    }
    console.log(`  ✓ quiz     ${sbCourseId}/${topicId} (${questions.length} questions)`)
  }

  for (const [topicId, task] of Object.entries(allCoding)) {
    const { error } = await supabase.from('course_coding_tasks').upsert(
      { course_id: sbCourseId, topic_id: topicId,
        instructions: task.instructions, boilerplate: task.boilerplate,
        rubric: task.rubric, hints: task.hints },
      { onConflict: 'course_id,topic_id' },
    )
    if (error) { errors.push(`coding ${sbCourseId}/${topicId}: ${error.message}`) }
    else { console.log(`  ✓ coding   ${sbCourseId}/${topicId}`); codingCount++ }
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
