'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { supabase, type Progress, type MilestoneProgress, type Submission } from './supabase'
import { useAuth } from './auth-context'
import { getCourse, getCourseTopics } from '@/data/curriculum'

type ProgressMap  = Record<string, Progress>           // key: `${courseId}__${topicId}`
type MilestoneMap = Record<string, MilestoneProgress>  // key: `${courseId}__${milestoneId}`

type ProgressState = {
  progressMap:          ProgressMap
  milestoneMap:         MilestoneMap
  loading:              boolean
  isTopicUnlocked:      (courseId: string, topicId: string) => boolean
  isMilestoneUnlocked:  (courseId: string, milestoneId: string) => boolean
  completeTopic:        (courseId: string, topicId: string, score: number, submission?: Submission) => Promise<void>
  completeMilestone:    (courseId: string, milestoneId: string, score: number) => Promise<void>
  getTopicProgress:     (courseId: string, topicId: string) => Progress | undefined
  getMilestoneProgress: (courseId: string, milestoneId: string) => MilestoneProgress | undefined
  refreshProgress:      () => Promise<void>
}

const ProgressContext = createContext<ProgressState>({
  progressMap:          {},
  milestoneMap:         {},
  loading:              true,
  isTopicUnlocked:      () => false,
  isMilestoneUnlocked:  () => false,
  completeTopic:        async () => {},
  completeMilestone:    async () => {},
  getTopicProgress:     () => undefined,
  getMilestoneProgress: () => undefined,
  refreshProgress:      async () => {},
})

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { user, profile, refreshProfile } = useAuth()
  const [progressMap,  setProgressMap]  = useState<ProgressMap>({})
  const [milestoneMap, setMilestoneMap] = useState<MilestoneMap>({})
  const [loading, setLoading] = useState(true)

  const fetchProgress = useCallback(async () => {
    if (!user) {
      setProgressMap({})
      setMilestoneMap({})
      setLoading(false)
      return
    }
    const [{ data: topicData }, { data: milestoneData }] = await Promise.all([
      supabase.from('progress').select('*').eq('user_id', user.id),
      supabase.from('milestone_progress').select('*').eq('user_id', user.id),
    ])

    const pMap: ProgressMap = {}
    topicData?.forEach(p => { pMap[`${p.course_id}__${p.topic_id}`] = p })
    setProgressMap(pMap)

    const mMap: MilestoneMap = {}
    milestoneData?.forEach(m => { mMap[`${m.course_id}__${m.milestone_id}`] = m })
    setMilestoneMap(mMap)

    setLoading(false)
  }, [user])

  useEffect(() => { fetchProgress() }, [fetchProgress])

  // One-time XP backfill: if a user has completed topics but profile.xp is 0,
  // the server didn't grant XP (e.g. pre-migration data). Calls the API route
  // which re-awards XP atomically if the topics aren't already reflected.
  useEffect(() => {
    if (!user || !profile || loading) return
    if ((profile.xp ?? 0) > 0) return  // already has XP, nothing to backfill

    const completedCount =
      Object.values(progressMap).filter(p => p.status === 'completed').length +
      Object.values(milestoneMap).filter(m => m.status === 'completed').length

    if (completedCount === 0) return

    // Backfill by computing XP client-side from the progress rows
    async function backfillXp() {
      const { getLevelForXp } = await import('./gamification')
      const { getCourseTopics: getTopics, getCourse: getCourseData } = await import('@/data/curriculum')

      let totalXp = 0
      for (const entry of Object.values(progressMap)) {
        if (entry.status !== 'completed') continue
        const t = getTopics(entry.course_id).find(t => t.id === entry.topic_id)
        if (t) totalXp += t.xp
      }
      for (const entry of Object.values(milestoneMap)) {
        if (entry.status !== 'completed') continue
        const m = getCourseData(entry.course_id)?.project.milestones.find(m => m.id === entry.milestone_id)
        if (m) totalXp += m.xp
      }
      if (totalXp === 0) return

      const newLevel = getLevelForXp(totalXp).level
      console.info(`[PromptPath] Backfilling XP: ${totalXp} XP, level ${newLevel}`)

      const { error } = await supabase
        .from('profiles')
        .update({ xp: totalXp, level: newLevel })
        .eq('id', user!.id)

      if (error) {
        console.error('[PromptPath] XP backfill failed:', error.message)
      } else {
        await refreshProfile()
      }
    }

    backfillXp()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, profile?.xp, loading, progressMap, milestoneMap])

  // Daily login streak — fires once per calendar day on app load.
  // Topic/milestone completion streaks are handled server-side in the API routes.
  useEffect(() => {
    if (!user || !profile || loading) return

    const today = new Date().toISOString().split('T')[0]
    if (profile.last_activity_date === today) return

    const userId = user.id

    async function updateDailyStreak() {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]

      const currentStreak  = profile!.current_streak  || 0
      const longestStreak  = profile!.longest_streak  || 0
      const lastActivity   = profile!.last_activity_date

      const newStreak  = lastActivity === yesterdayStr ? currentStreak + 1 : 1
      const newLongest = Math.max(longestStreak, newStreak)

      const { error } = await supabase
        .from('profiles')
        .update({ current_streak: newStreak, longest_streak: newLongest, last_activity_date: today })
        .eq('id', userId)

      if (error) {
        console.error('[PromptPath] Daily streak update failed:', error.message)
      } else {
        await refreshProfile()
      }
    }

    updateDailyStreak()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, profile?.last_activity_date, loading])

  const isTopicUnlocked = useCallback((courseId: string, topicId: string): boolean => {
    const allTopics = getCourseTopics(courseId)
    const idx = allTopics.findIndex(t => t.id === topicId)
    if (idx === 0)  return true
    if (idx === -1) return false
    const prevTopic = allTopics[idx - 1]
    return progressMap[`${courseId}__${prevTopic.id}`]?.status === 'completed'
  }, [progressMap])

  const isMilestoneUnlocked = useCallback((courseId: string, milestoneId: string): boolean => {
    const course = getCourse(courseId)
    if (!course) return false
    const milestones = course.project.milestones
    const idx = milestones.findIndex(m => m.id === milestoneId)
    if (idx === 0)  return true
    if (idx === -1) return false
    const prevMilestone = milestones[idx - 1]
    return milestoneMap[`${courseId}__${prevMilestone.id}`]?.status === 'completed'
  }, [milestoneMap])

  // ── Topic completion ─────────────────────────────────────────────────────
  // All XP / streak / badge logic runs server-side in /api/complete-topic.
  // This function is intentionally thin: call the route, refresh local state.
  const completeTopic = useCallback(async (
    courseId:   string,
    topicId:    string,
    score:      number,
    submission?: Submission,
  ) => {
    if (!user) return

    const res = await fetch('/api/complete-topic', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ courseId, topicId, score, submission: submission ?? null }),
    })

    if (!res.ok) {
      console.error('[PromptPath] complete-topic API error:', res.status, await res.text())
    }

    await fetchProgress()
    await refreshProfile()
  }, [user, fetchProgress, refreshProfile])

  // ── Milestone completion ─────────────────────────────────────────────────
  const completeMilestone = useCallback(async (
    courseId:    string,
    milestoneId: string,
    score:       number,
  ) => {
    if (!user) return

    const res = await fetch('/api/complete-milestone', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ courseId, milestoneId, score }),
    })

    if (!res.ok) {
      console.error('[PromptPath] complete-milestone API error:', res.status, await res.text())
    }

    await fetchProgress()
    await refreshProfile()
  }, [user, fetchProgress, refreshProfile])

  const getTopicProgress = useCallback(
    (courseId: string, topicId: string) => progressMap[`${courseId}__${topicId}`],
    [progressMap],
  )

  const getMilestoneProgress = useCallback(
    (courseId: string, milestoneId: string) => milestoneMap[`${courseId}__${milestoneId}`],
    [milestoneMap],
  )

  return (
    <ProgressContext.Provider value={{
      progressMap, milestoneMap, loading,
      isTopicUnlocked, isMilestoneUnlocked,
      completeTopic, completeMilestone,
      getTopicProgress, getMilestoneProgress,
      refreshProgress: fetchProgress,
    }}>
      {children}
    </ProgressContext.Provider>
  )
}

export const useProgress = () => useContext(ProgressContext)
