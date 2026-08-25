/**
 * Strips solutionCode values from curriculum.ts in-place.
 *
 * Run AFTER seed-solutions.ts has successfully seeded the DB.
 * After this runs, curriculum.ts will have solutionCode: '' everywhere —
 * the actual solution code only lives in content_solutions in Supabase.
 *
 * Usage:
 *   node scripts/strip-solutions.mjs [--dry-run]
 *
 * What it does:
 *   Replaces every  solutionCode: `<multiline content>`
 *   with            solutionCode: ''
 *
 * Safe to rerun — idempotent (already-stripped entries are unchanged).
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const DRY_RUN = process.argv.includes('--dry-run')
const TARGET  = resolve(process.cwd(), 'src/data/curriculum.ts')

let src = readFileSync(TARGET, 'utf-8')

// Match:   solutionCode: `...anything including newlines...`
// Skips escaped backticks (\`) inside the content so that solution code containing
// triple-backtick fences (escaped as \`\`\` in TS template literals) is handled correctly.
const PATTERN = /solutionCode:\s*`(?:[^`\\]|\\.)*`/g

let count = 0
const patched = src.replace(PATTERN, () => {
  count++
  return "solutionCode: ''"
})

if (count === 0) {
  console.log('No solutionCode template literals found — already stripped or pattern mismatch.')
  process.exit(0)
}

if (DRY_RUN) {
  console.log(`Dry run: would strip ${count} solutionCode value(s). No file written.`)
  process.exit(0)
}

writeFileSync(TARGET, patched, 'utf-8')
console.log(`Stripped ${count} solutionCode value(s) from src/data/curriculum.ts.`)
console.log('Verify the file looks correct, then commit.')
