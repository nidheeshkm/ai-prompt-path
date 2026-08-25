import 'server-only'
import { createAdminClient } from './supabase-admin'

/**
 * Server-only access to solution code.
 *
 * content_solutions and content_milestone_solutions have RLS enabled with
 * zero SELECT policies — the only way to read them is via the service-role
 * client (which bypasses RLS). This module is the sole entry point.
 *
 * Never import this module from 'use client' components or client-side files.
 * The `import 'server-only'` guard makes Next.js throw a build error if you try.
 */

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
    // Not found is expected before the seed has run — fall back to curriculum.ts
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
