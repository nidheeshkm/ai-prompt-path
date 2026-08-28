/**
 * Strip content, quiz, and codingTask fields from curriculum.ts
 * after the seed-content script has run successfully.
 *
 * Run: node scripts/strip-content.mjs
 *
 * Only strips when the value is literally a template literal (for content),
 * an array literal (for quiz), or an object literal (for codingTask).
 * Leaves type annotations, function calls, and anything else untouched.
 */

import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const root  = join(__dir, '..')
const file  = join(root, 'src/data/curriculum.ts')

// ── Verify DB is seeded before touching the file ──────────────────────────────
try {
  const env = readFileSync(join(root, '.env.local'), 'utf8')
  for (const line of env.split('\n')) {
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const k = line.slice(0, eq).trim()
    const v = line.slice(eq + 1).trim()
    if (k && !process.env[k]) process.env[k] = v
  }
} catch { /* env vars may already be set */ }

const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

const { createClient } = await import('@supabase/supabase-js')
const supabase = createClient(supabaseUrl, serviceRoleKey)
const { count } = await supabase
  .from('course_topic_content')
  .select('*', { count: 'exact', head: true })

if (!count || count === 0) {
  console.error('ERROR: course_topic_content is empty. Run seed-content.ts first.')
  process.exit(1)
}
console.log(`Verified: ${count} lesson(s) in DB. Proceeding with strip…\n`)

// ── Character-by-character parser ─────────────────────────────────────────────

const src = readFileSync(file, 'utf8')
let i = 0
let out = ''
let stripped = 0

function peek(n = 1) { return src.slice(i, i + n) }
function consume(n = 1) { const s = src.slice(i, i + n); i += n; return s }

function consumeWhitespace() {
  let ws = ''
  while (i < src.length && /[ \t\n\r]/.test(src[i])) ws += consume()
  return ws
}

// Skip a template literal that starts at the current position (opening ` already consumed)
function skipTemplateLiteralBody() {
  while (i < src.length) {
    const ch = src[i]
    if (ch === '\\') { consume(2); continue }         // escaped char (handles \`)
    if (ch === '$' && src[i + 1] === '{') {            // ${...} expression
      consume(2); skipBalanced('{', '}'); continue
    }
    if (ch === '`') { consume(); return }              // closing `
    consume()
  }
}

// Skip a balanced bracket pair; the opening bracket has already been consumed
function skipBalanced(open, close) {
  let depth = 1
  while (i < src.length && depth > 0) {
    const ch = src[i]
    if (ch === '\\') { consume(2); continue }
    if (ch === '`')  { consume(); skipTemplateLiteralBody(); continue }
    if (ch === '"' || ch === "'") { skipQuotedString(ch); continue }
    if (ch === '/' && src[i + 1] === '/') { skipLineComment(); continue }
    if (ch === '/' && src[i + 1] === '*') { skipBlockComment(); continue }
    if (ch === open)  { depth++; consume(); continue }
    if (ch === close) { depth--; consume(); continue }
    consume()
  }
}

function skipQuotedString(q) {
  consume() // opening quote
  while (i < src.length) {
    const ch = src[i]
    if (ch === '\\') { consume(2); continue }
    if (ch === q)    { consume(); return }
    consume()
  }
}

function skipLineComment() {
  while (i < src.length && src[i] !== '\n') consume()
}

function skipBlockComment() {
  consume(2) // /*
  while (i < src.length) {
    if (src[i] === '*' && src[i + 1] === '/') { consume(2); return }
    consume()
  }
}

// Skip line and block comments at the current position, emitting them into out
function passThruComments() {
  if (src[i] === '/' && src[i + 1] === '/') {
    while (i < src.length && src[i] !== '\n') out += consume()
    return true
  }
  if (src[i] === '/' && src[i + 1] === '*') {
    out += consume(2)
    while (i < src.length) {
      if (src[i] === '*' && src[i + 1] === '/') { out += consume(2); break }
      out += consume()
    }
    return true
  }
  return false
}

// ── Main parse loop ───────────────────────────────────────────────────────────
//
// Strategy: walk char by char, pass everything through to `out`. When we see
// one of the target field names followed by `:` followed by whitespace followed
// by the expected value start character, replace the value with the stub.
//
// Only strip:
//   content:    <backtick>  → content: ''
//   quiz:       [           → quiz: []
//   codingTask: {           → codingTask: undefined

const targets = [
  { name: 'content',    valueStart: '`', replacement: "content: ''" },
  { name: 'quiz',       valueStart: '[', replacement: 'quiz: []' },
  { name: 'codingTask', valueStart: '{', replacement: 'codingTask: undefined' },
]

while (i < src.length) {
  // Pass through comments unchanged
  if (passThruComments()) continue

  // Pass through template literals unchanged (we are NOT inside one here)
  if (src[i] === '`') {
    out += consume()
    while (i < src.length) {
      const ch = src[i]
      if (ch === '\\') { out += consume(2); continue }
      if (ch === '$' && src[i + 1] === '{') {
        out += consume(2)
        // emit the ${...} contents — we don't strip inside expressions
        let depth = 1
        while (i < src.length && depth > 0) {
          const c = src[i]
          if (c === '{') { depth++; out += consume(); continue }
          if (c === '}') { depth--; out += consume(); continue }
          out += consume()
        }
        continue
      }
      out += consume()
      if (ch === '`') break // closing backtick (already emitted above)
    }
    continue
  }

  // Pass through quoted strings unchanged
  if (src[i] === '"' || src[i] === "'") {
    const q = src[i]
    out += consume()
    while (i < src.length) {
      const ch = src[i]
      if (ch === '\\') { out += consume(2); continue }
      out += consume()
      if (ch === q) break
    }
    continue
  }

  // Try each target field
  let matched = false
  for (const target of targets) {
    const { name, valueStart, replacement } = target

    // The field name must start at position i
    if (!src.startsWith(name, i)) continue

    // After the name, allow only optional whitespace then ':'
    let j = i + name.length
    while (j < src.length && /[ \t]/.test(src[j])) j++
    if (src[j] !== ':') continue

    // After ':', allow optional whitespace, then check value start character
    let k = j + 1
    while (k < src.length && /[ \t\n\r]/.test(src[k])) k++
    if (src[k] !== valueStart) continue

    // Confirmed — consume and discard the value, emit the stub
    i = k // jump to the value start character
    if (valueStart === '`') { consume(); skipTemplateLiteralBody() }
    else if (valueStart === '[') { consume(); skipBalanced('[', ']') }
    else if (valueStart === '{') { consume(); skipBalanced('{', '}') }

    out += replacement
    stripped++
    matched = true
    break
  }

  if (!matched) out += consume()
}

if (stripped === 0) {
  console.log('Nothing stripped — curriculum.ts appears already clean.')
  process.exit(0)
}

const before = src.length
const after  = out.length

writeFileSync(file, out, 'utf8')
console.log(`Stripped ${stripped} field value(s).`)
console.log(`curriculum.ts: ${(before / 1024).toFixed(0)} KB → ${(after / 1024).toFixed(0)} KB (saved ${((before - after) / 1024).toFixed(0)} KB)`)
console.log('\nRun: npx tsc --noEmit   to verify the result is valid TypeScript.')
