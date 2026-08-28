import 'server-only'
import { createAdminClient } from './supabase-admin'

/**
 * Server-only access to course content and solutions.
 *
 * All tables (content_solutions, content_milestone_solutions,
 * course_topic_content, course_quiz_questions, course_coding_tasks) have RLS
 * enabled. The service-role client bypasses RLS — this module is the sole
 * entry point for server-side reads.
 *
 * Never import this module from 'use client' components or client-side files.
 * The `import 'server-only'` guard makes Next.js throw a build error if you try.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type ClientQuizQuestion = {
  question: string
  options: string[]
  // correctIndex and explanation are intentionally omitted — grading is server-side
}

export type ClientCodingTask = {
  instructions:  string
  boilerplate:   string
  rubric:        string[]
  hints:         string[]
  solutionCode:  ''   // always empty — real solution is fetched via /api/solution after unlock
}

// ── Lesson content ────────────────────────────────────────────────────────────

export async function getTopicContent(
  courseId: string,
  topicId:  string,
): Promise<string | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('course_topic_content')
    .select('content')
    .eq('course_id', courseId)
    .eq('topic_id', topicId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    console.error('[server/curriculum] getTopicContent error:', error.message)
    return null
  }

  return data.content ?? null
}

// ── Quiz questions (client-safe — no correctIndex / explanation) ───────────────

export async function getTopicQuizQuestions(
  courseId: string,
  topicId:  string,
): Promise<ClientQuizQuestion[] | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('course_quiz_questions')
    .select('question, options')
    .eq('course_id', courseId)
    .eq('topic_id', topicId)
    .order('question_index')

  if (error) {
    if (error.code === 'PGRST116') return null
    console.error('[server/curriculum] getTopicQuizQuestions error:', error.message)
    return null
  }

  if (!data || data.length === 0) return null

  return data.map(row => ({
    question: row.question as string,
    options:  row.options as string[],
  }))
}

// ── Quiz grading — server-side only (includes correctIndex + explanation) ─────

export type QuizResult = {
  correct:     boolean
  explanation: string
}

export async function gradeQuiz(
  courseId: string,
  topicId:  string,
  answers:  number[],
): Promise<{ score: number; passed: boolean; results: QuizResult[] } | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('course_quiz_questions')
    .select('question_index, correct_index, explanation')
    .eq('course_id', courseId)
    .eq('topic_id', topicId)
    .order('question_index')

  if (error || !data || data.length === 0) {
    console.error('[server/curriculum] gradeQuiz error:', error?.message)
    return null
  }

  let correct = 0
  const results: QuizResult[] = data.map((row, idx) => {
    const isCorrect = answers[idx] === (row.correct_index as number)
    if (isCorrect) correct++
    return {
      correct:     isCorrect,
      explanation: row.explanation as string,
    }
  })

  const score = Math.round((correct / data.length) * 100)
  return { score, passed: score >= 80, results }
}

// ── Coding task ───────────────────────────────────────────────────────────────

export async function getTopicCodingTask(
  courseId: string,
  topicId:  string,
): Promise<ClientCodingTask | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('course_coding_tasks')
    .select('instructions, boilerplate, rubric, hints')
    .eq('course_id', courseId)
    .eq('topic_id', topicId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    console.error('[server/curriculum] getTopicCodingTask error:', error.message)
    return null
  }

  return {
    instructions: data.instructions as string,
    boilerplate:  data.boilerplate as string,
    rubric:       data.rubric as string[],
    hints:        data.hints as string[],
    solutionCode: '' as const,
  }
}

// ── Solutions (existing) ──────────────────────────────────────────────────────

export async function getTopicSolution(
  courseId: string,
  topicId:  string,
): Promise<string | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('content_solutions')
    .select('solution_code')
    .eq('course_id', courseId)
    .eq('topic_id', topicId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    console.error('[server/curriculum] getTopicSolution error:', error.message)
    return null
  }

  return data.solution_code ?? null
}

export async function getMilestoneSolution(
  courseId:    string,
  milestoneId: string,
): Promise<string | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('content_milestone_solutions')
    .select('solution_code')
    .eq('course_id', courseId)
    .eq('milestone_id', milestoneId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    console.error('[server/curriculum] getMilestoneSolution error:', error.message)
    return null
  }

  return data.solution_code ?? null
}
