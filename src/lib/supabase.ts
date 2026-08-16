import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

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
}

export type Progress = {
  id: string
  user_id: string
  topic_id: string
  status: 'locked' | 'in_progress' | 'completed'
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
