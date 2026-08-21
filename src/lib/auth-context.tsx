'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { supabase, type Profile } from './supabase'
import type { User } from '@supabase/supabase-js'

type AuthState = {
  user: User | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthState>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId: string) => {
    // Select every column EXCEPT openrouter_api_key — the raw secret must never
    // reach the browser. We derive a boolean flag from its presence instead.
    const { data: existing } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, xp, level, current_streak, longest_streak, last_activity_date, created_at, openrouter_api_key')
      .eq('id', userId)
      .single()

    if (existing) {
      const { openrouter_api_key, ...rest } = existing
      setProfile({ ...rest, has_openrouter_key: Boolean(openrouter_api_key) })
      return
    }

    // Profile missing (trigger didn't fire or first OAuth login) — create it now.
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return
    const { data: created } = await supabase.from('profiles').upsert({
      id: userId,
      display_name:
        authUser.user_metadata?.display_name ||
        authUser.user_metadata?.full_name ||
        authUser.email?.split('@')[0] ||
        'Learner',
      avatar_url: authUser.user_metadata?.avatar_url ?? null,
      xp: 0,
      level: 1,
      current_streak: 0,
      longest_streak: 0,
    }, { onConflict: 'id' }).select('id, display_name, avatar_url, xp, level, current_streak, longest_streak, last_activity_date, created_at, openrouter_api_key').single()

    if (created) {
      const { openrouter_api_key, ...rest } = created
      setProfile({ ...rest, has_openrouter_key: Boolean(openrouter_api_key) })
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id)
  }, [user, fetchProfile])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setProfile(null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
