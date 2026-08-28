---
name: add-course-content
description: Add new course content, chapters, or topics. Write lesson text, quiz questions, and coding tasks for existing or new courses. Covers the full workflow: content file → curriculum.ts stub → seed → strip.
---

# Add Course Content

This project stores course content in two layers:

1. **`scripts/content/*.ts`** — the source-of-truth content files (lesson text, quiz questions, coding tasks). These are version-controlled and seeded to Supabase.
2. **`src/data/curriculum.ts`** — metadata stubs only (`content: ''`, `quiz: []`, `codingTask: undefined`). The UI fetches real content from Supabase at runtime.

The DB is the serving layer. The content files are the authoring layer. Never write real content directly into `curriculum.ts`.

---

## Quick decision: existing course vs new course

- **Adding chapters/topics to an existing course** → Step A then Steps 1–5
- **Creating a brand new course** → Step A then Steps 1–6

---

## Step A — Understand the existing patterns

Read one existing content file before writing anything new:

```bash
# See the Part III (Spring Boot) content file structure
head -60 scripts/content/springboot-part3-ch208.ts
```

Every content file exports three named objects:

```typescript
import type { QuizQuestion } from '../../src/data/curriculum'

export const courseId = '<course-id>'  // matches courses[].id in curriculum.ts

export const content: Record<string, string> = {
  '<chapterNum>.<topicNum>': `# Topic Title\n\n...markdown lesson text...`,
}

export const quiz: Record<string, QuizQuestion[]> = {
  '<chapterNum>.<topicNum>': [
    {
      question: 'Question text?',
      options: ['A', 'B', 'C', 'D'],
      correctIndex: 0,   // 0-indexed; NEVER sent to client
      explanation: 'Why this answer is correct.',
    },
    // 5 questions per topic is standard
  ],
}

export const codingTask: Record<string, CodingTask> = {
  // Only topics with assessmentType: 'coding' need this
  '<chapterNum>.<topicNum>': {
    instructions: `What the learner must implement, with acceptance criteria.`,
    boilerplate: `// starter code the learner sees in the editor`,
    rubric: ['What the auto-grader checks (one string per criterion)'],
    hints: ['Progressive hints shown on request'],
    // NOTE: solutionCode is intentionally omitted — seeder skips it
  },
}
```

**Content quality bar:**
- Each lesson: 600–1200 words, uses markdown headers, tables, and fenced code blocks
- Quiz: 5 questions per topic; distractors must be plausible; explanations must be educational
- Coding task: instructions include explicit acceptance criteria; boilerplate has `// TODO:` comments; rubric entries are verifiable by string matching or AST

---

## Step 1 — Create content files

### Naming convention

```
scripts/content/<courseSlug>-part<N>-ch<chapterNum>.ts
scripts/content/<courseSlug>-part<N>-index.ts   ← barrel re-export
```

Examples:
- `springboot-part3-ch208.ts` → Part III of the Spring Boot course, Chapter 208
- `springboot-part4-ch213.ts` → Part IV, Chapter 213

### Write the content file

Use the template at Step A as your structure. Key rules:

1. Template literals for lesson content **must not** start with a backtick that would be confused with a code fence — write them exactly as in the existing files (the content starts right after the backtick, with `# Heading` on the first line).
2. `codingTask` entries must **not** include `solutionCode` — the seeder omits that field deliberately (it is never stored in the public DB tables).
3. Topic IDs in the content/quiz/codingTask records must **exactly match** the topic `id` values you add to `curriculum.ts` in Step 3.

### Create the barrel index

```typescript
// scripts/content/springboot-part4-index.ts
export { content as ch213Content, quiz as ch213Quiz, codingTask as ch213CodingTask } from './springboot-part4-ch213'
export { content as ch214Content, quiz as ch214Quiz, codingTask as ch214CodingTask } from './springboot-part4-ch214'
// ... one line per chapter

export const courseId = 'springboot-ai-architect'  // must match curriculum.ts
```

---

## Step 2 — Update seed-content.ts

Open `scripts/seed-content.ts` and add:

1. Import the new Part index at the top:
```typescript
import {
  ch213Content, ch213Quiz, ch213CodingTask,
  // ...
  courseId as sbCourseId,
} from './content/springboot-part4-index'
```

2. Merge into the `allContent`/`allQuiz`/`allCoding` spread objects:
```typescript
const allContent = { ...ch208Content, ...ch209Content, /* ... */ ...ch213Content, ... }
const allQuiz    = { ...ch208Quiz,    ...ch209Quiz,    /* ... */ ...ch213Quiz,    ... }
const allCoding  = { ...ch208CodingTask, /* ... */     ...ch213CodingTask, ... }
```

---

## Step 3 — Add metadata stubs to curriculum.ts

Find the right course in `src/data/curriculum.ts` and add the chapter stubs inside its `chapters` array. **Content fields must be empty** — the UI reads from DB:

```typescript
{
  id: 213,
  title: 'Spring Security 6.x',
  description: 'One-line chapter description.',
  part: 'Part IV: Security + Testcontainers',
  icon: '🔐',
  topics: [
    {
      id: '213.1',
      title: 'SecurityFilterChain & the New DSL',
      xp: 100,
      assessmentType: 'quiz' as const,
      content: '',
      quiz: [],
    },
    {
      id: '213.2',
      title: 'JWT Authentication from Scratch',
      xp: 150,
      assessmentType: 'coding' as const,
      content: '',
      codingTask: undefined,
    },
    // ...
  ],
},
```

**XP guidelines** (match existing chapters):
- Quiz-only topic: 60–100 XP
- Coding topic (moderate): 125–150 XP
- Coding topic (complex / integration): 175–200 XP
- Mini-project: 250–500 XP

**assessmentType rules:**
- `'quiz'` → `quiz: []` in stub (no `codingTask`)
- `'coding'` → `codingTask: undefined` in stub (no `quiz`)
- `'mini-project'` → `codingTask: undefined` in stub

---

## Step 4 — Type-check

```bash
npx tsc --noEmit
```

Must return zero errors before seeding. Common mistakes:
- `codingTask` object in content file includes `solutionCode` (remove it — the DB schema doesn't have that column)
- Topic ID mismatch between content file and curriculum.ts stub
- `assessmentType: 'coding'` stub with `quiz: []` instead of `codingTask: undefined`

---

## Step 5 — Seed to Supabase

```bash
npx tsx scripts/seed-content.ts
```

Requires `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.

The seed script uses `upsert` with `onConflict` — safe to re-run. After seeding, the UI will serve real content from Supabase without any redeploy.

### Optional: strip content from curriculum.ts

After confirming the DB is seeded, strip the inline content from `curriculum.ts` to keep bundle size small:

```bash
node scripts/strip-content.mjs
```

**Warning:** The strip script is a character-by-character parser — only run after seeding is confirmed. If it corrupts the file, restore with:

```bash
git restore src/data/curriculum.ts
```

---

## Step 6 — Adding a brand new course (new courseId)

Do this only when creating a course that doesn't appear in `courses[]` in `curriculum.ts`.

1. Add the course metadata to `courses` in `curriculum.ts`:

```typescript
{
  id: 'my-new-course',
  title: 'Course Title',
  tagline: 'Short marketing line',
  description: 'Full description shown on the course card.',
  icon: '🚀',
  level: 'intermediate' as const,  // 'beginner' | 'intermediate' | 'advanced'
  estimatedHours: 40,
  tags: ['Tag1', 'Tag2'],
  levelTitles: ['Title1', 'Title2', 'Title3', 'Title4', 'Title5'] as [string, string, string, string, string],
  chapters: [
    // ... chapter stubs per Step 3
  ],
}
```

2. The content files use `export const courseId = 'my-new-course'` to tie to this entry.

3. In `seed-content.ts`, create a parallel seeding block for the new course (copy the Part III block as a template, using `myNewCourseId` instead of `sbCourseId`).

---

## Gotchas

- **Topic ID format**: Spring Boot chapters use `'208.1'` (number dot number as string). LangChain chapters use `'1.1'`. Both are strings — never use `208_1` or `topic_208_1`.
- **`courseId` in content files must match exactly**: The seed script uses it as the `course_id` foreign key in Supabase. A typo means content goes to a non-existent course and the UI falls back to empty.
- **`quiz: []` vs `codingTask: undefined`**: TypeScript will accept both in either position. But the UI reads `assessmentType` to decide what to show, so mismatches cause runtime blank panels.
- **Template literal backticks in content**: If lesson text contains a markdown code fence with backticks, escape them as `` \` `` inside the template literal, or use the character-by-character facts — the existing files use this pattern throughout.
- **`solutionCode` field**: `CodingTask` in `curriculum.ts` requires `solutionCode: string`. Content files do NOT include it. The server-side `getTopicCodingTask()` function injects `solutionCode: '' as const` when returning to the client. If you see a TS error about `solutionCode`, you're importing `CodingTask` instead of using the inline object — remove the type annotation.
- **Run `tsc --noEmit` before seeding**: Seeding a malformed content object creates bad DB rows that are hard to clean up (the upsert will succeed but data will be wrong).

---

## File map

```
src/data/curriculum.ts              ← metadata stubs only
scripts/seed-content.ts             ← imports all content, seeds to DB
scripts/strip-content.mjs           ← strips inline content post-seed
scripts/content/
  springboot-part3-ch208.ts         ← content source (Part III, Ch 208)
  springboot-part3-ch209.ts
  ...
  springboot-part3-index.ts         ← barrel re-export for Part III
  <new>-part<N>-ch<NNN>.ts          ← your new files go here
  <new>-part<N>-index.ts
src/server/curriculum.ts            ← server-side DB fetch functions (do not edit for content)
```
