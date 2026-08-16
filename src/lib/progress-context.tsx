'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { supabase, type Progress } from './supabase'
import { useAuth } from './auth-context'
import { curriculum, getAllTopics, getNextTopic } from '@/data/curriculum'

type ProgressMap = Record<string, Progress>

type ProgressState = {
  progressMap: ProgressMap
  loading: boolean
  isTopicUnlocked: (topicId: string) => boolean
  completeTopic: (topicId: string, score: number) => Promise<void>
  getTopicProgress: (topicId: string) => Progress | undefined
  refreshProgress: () => Promise<void>
}

const ProgressContext = createContext<ProgressState>({
  progressMap: {},
  loading: true,
  isTopicUnlocked: () => false,
  completeTopic: async () => {},
  getTopicProgress: () => undefined,
  refreshProgress: async () => {},
})

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { user, profile, refreshProfile } = useAuth()
  const [progressMap, setProgressMap] = useState<ProgressMap>({})
  const [loading, setLoading] = useState(true)

  const fetchProgress = useCallback(async () => {
    if (!user) {
      setProgressMap({})
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('progress')
      .select('*')
      .eq('user_id', user.id)

    const map: ProgressMap = {}
    data?.forEach((p) => { map[p.topic_id] = p })
    setProgressMap(map)
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchProgress()
  }, [fetchProgress])

  const isTopicUnlocked = useCallback((topicId: string): boolean => {
    // First topic is always unlocked
    const allTopics = getAllTopics()
    const idx = allTopics.findIndex(t => t.id === topicId)
    if (idx === 0) return true
    if (idx === -1) return false

    // Check if previous topic is completed
    const prevTopic = allTopics[idx - 1]
    return progressMap[prevTopic.id]?.status === 'completed'
  }, [progressMap])

  const completeTopic = useCallback(async (topicId: string, score: number) => {
    if (!user || !profile) return

    const allTopics = getAllTopics()
    const topic = allTopics.find(t => t.id === topicId)
    if (!topic) return

    const existing = progressMap[topicId]
    const attempts = (existing?.attempts || 0) + 1

    // Upsert progress
    await supabase.from('progress').upsert({
      user_id: user.id,
      topic_id: topicId,
      status: 'completed',
      score,
      attempts,
      completed_at: new Date().toISOString(),
    }, { onConflict: 'user_id,topic_id' })

    // Award XP only on first completion
    if (!existing || existing.status !== 'completed') {
      const { getStreakMultiplier } = await import('./gamification')
      const multiplier = getStreakMultiplier(profile.current_streak || 0)
      const xpEarned = Math.round(topic.xp * multiplier)
      const newXp = (profile.xp || 0) + xpEarned

      const { getLevelForXp } = await import('./gamification')
      const newLevel = getLevelForXp(newXp).level

      // Update streak
      const today = new Date().toISOString().split('T')[0]
      const lastActivity = profile.last_activity_date
      let newStreak = profile.current_streak || 0
      let longestStreak = profile.longest_streak || 0

      if (lastActivity !== today) {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]

        if (lastActivity === yesterdayStr) {
          newStreak += 1
        } else if (lastActivity !== today) {
          newStreak = 1
        }
        longestStreak = Math.max(longestStreak, newStreak)
      }

      await supabase.from('profiles').update({
        xp: newXp,
        level: newLevel,
        current_streak: newStreak,
        longest_streak: longestStreak,
        last_activity_date: today,
      }).eq('id', user.id)

      // Check badges
      await checkAndAwardBadges(user.id, topicId, score, attempts, newStreak)
    }

    await fetchProgress()
    await refreshProfile()
  }, [user, profile, progressMap, fetchProgress, refreshProfile])

  const getTopicProgress = useCallback((topicId: string) => {
    return progressMap[topicId]
  }, [progressMap])

  return (
    <ProgressContext.Provider value={{ progressMap, loading, isTopicUnlocked, completeTopic, getTopicProgress, refreshProgress: fetchProgress }}>
      {children}
    </ProgressContext.Provider>
  )
}

async function checkAndAwardBadges(userId: string, topicId: string, score: number, attempts: number, streak: number) {
  const badges: string[] = []

  // First lesson
  if (topicId === '1.1') badges.push('first_lesson')

  // Chapter completion
  const chapterNum = parseInt(topicId.split('.')[0])
  const chapter = curriculum.find(c => c.id === chapterNum)
  if (chapter) {
    const { data: userProgress } = await supabase
      .from('progress')
      .select('topic_id')
      .eq('user_id', userId)
      .eq('status', 'completed')

    const completedIds = new Set(userProgress?.map(p => p.topic_id) || [])
    completedIds.add(topicId)

    const allChapterDone = chapter.topics.every(t => completedIds.has(t.id))
    if (allChapterDone) {
      badges.push(`chapter_${chapterNum}`)
    }

    // Halfway
    const allTopics = getAllTopics()
    const completedCount = allTopics.filter(t => completedIds.has(t.id)).length
    if (completedCount >= 40) badges.push('halfway')

    // Course complete
    if (completedCount >= allTopics.length) badges.push('course_complete')
  }

  // Perfect score
  if (score === 100) badges.push('perfect_quiz')

  // First try
  if (attempts === 1 && score >= 70) badges.push('first_try')

  // Streak badges
  if (streak >= 3) badges.push('streak_3')
  if (streak >= 7) badges.push('streak_7')
  if (streak >= 14) badges.push('streak_14')
  if (streak >= 30) badges.push('streak_30')

  // Award badges
  for (const badge of badges) {
    await supabase.from('badges').upsert({
      user_id: userId,
      badge_type: badge,
      earned_at: new Date().toISOString(),
    }, { onConflict: 'user_id,badge_type' }).select()
  }
}

export const useProgress = () => useContext(ProgressContext)
