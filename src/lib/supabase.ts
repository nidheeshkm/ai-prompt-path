import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
// Accept both the new Supabase publishable key name and the legacy anon key name
// so existing production deployments keep working without an immediate env var change.
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Profile = {
  id: string
  display_name: string
  avatar_url: string | null
  xp: number
  level: number
  current_streak: number
  longest_streak: number
  last_activity_date: string | null
  created_at: string
  // Never the actual key — just whether one is configured (derived server-side)
  has_openrouter_key: boolean
}

export type QuizSubmission = { type: 'quiz'; answers: number[] }
export type CodingSubmission = { type: 'coding'; code: string }
export type Submission = QuizSubmission | CodingSubmission

export type Progress = {
  id: string
  user_id: string
  course_id: string
  topic_id: string
  status: 'locked' | 'in_progress' | 'completed'
  score: number
  attempts: number
  completed_at: string | null
  submission: Submission | null
}

export type Enrollment = {
  id: string
  user_id: string
  course_id: string
  enrolled_at: string
  completed_at: string | null
}

export type Certificate = {
  id: string
  certificate_id: string
  user_id: string
  course_id: string
  issued_at: string
}

export type MilestoneProgress = {
  id: string
  user_id: string
  course_id: string
  milestone_id: string
  status: 'in_progress' | 'completed'
  score: number
  attempts: number
  completed_at: string | null
}

export type Badge = {
  id: string
  user_id: string
  badge_type: string
  earned_at: string
}
