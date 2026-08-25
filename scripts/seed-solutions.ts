/**
 * Seed solutions into Supabase before stripping them from curriculum.ts.
 *
 * Run ONCE, in this order:
 *   1. Apply migration 010 in the Supabase SQL Editor
 *   2. npx tsx scripts/seed-solutions.ts
 *   3. node scripts/strip-solutions.mjs
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in your environment (or .env.local).
 *
 * The service-role key bypasses RLS — keep it server-side only, never commit it.
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { courses } from '../src/data/curriculum'

// Load .env.local so the script picks up the service-role key locally
config({ path: '.env.local' })

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.')
  console.error('Add SUPABASE_SERVICE_ROLE_KEY to .env.local (never commit it).')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function seed() {
  console.log('Seeding content_solutions and content_milestone_solutions...\n')

  let topicCount     = 0
  let milestoneCount = 0
  const errors: string[] = []

  for (const course of courses) {
    // ── Topic solutions ──────────────────────────────────────────────────────
    for (const chapter of course.chapters) {
      for (const topic of chapter.topics) {
        if (!topic.codingTask?.solutionCode) continue

        const { error } = await supabase
          .from('content_solutions')
          .upsert(
            {
              course_id:     course.id,
              topic_id:      topic.id,
              solution_code: topic.codingTask.solutionCode,
            },
            { onConflict: 'course_id,topic_id' },
          )

        if (error) {
          errors.push(`topic ${course.id}/${topic.id}: ${error.message}`)
        } else {
          console.log(`  ✓ topic  ${course.id}/${topic.id}`)
          topicCount++
        }
      }
    }

    // ── Milestone solutions ──────────────────────────────────────────────────
    for (const milestone of course.project.milestones) {
      if (!milestone.solutionCode) continue

      const { error } = await supabase
        .from('content_milestone_solutions')
        .upsert(
          {
            course_id:     course.id,
            milestone_id:  milestone.id,
            solution_code: milestone.solutionCode,
          },
          { onConflict: 'course_id,milestone_id' },
        )

      if (error) {
        errors.push(`milestone ${course.id}/${milestone.id}: ${error.message}`)
      } else {
        console.log(`  ✓ milestone ${course.id}/${milestone.id}`)
        milestoneCount++
      }
    }
  }

  console.log(`\nSeeded ${topicCount} topic solutions, ${milestoneCount} milestone solutions.`)

  if (errors.length > 0) {
    console.error('\nErrors:')
    errors.forEach(e => console.error('  ✗', e))
    console.error('\nFix the errors then rerun. Safe to rerun — all inserts are upserts.')
    process.exit(1)
  }

  console.log('\nNext step: node scripts/strip-solutions.mjs')
}

seed()
