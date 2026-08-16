'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { supabase, type Progress, type MilestoneProgress } from './supabase'
import { useAuth } from './auth-context'
import { getCourse, getCourseTopics } from '@/data/curriculum'

type ProgressMap = Record<string, Progress>           // key: `${courseId}__${topicId}`
type MilestoneMap = Record<string, MilestoneProgress> // key: `${courseId}__${milestoneId}`

type ProgressState = {
  progressMap: ProgressMap
  milestoneMap: MilestoneMap
  loading: boolean
  isTopicUnlocked: (courseId: string, topicId: string) => boolean
  isMilestoneUnlocked: (courseId: string, milestoneId: string) => boolean
  completeTopic: (courseId: string, topicId: string, score: number) => Promise<void>
  completeMilestone: (courseId: string, milestoneId: string, score: number) => Promise<void>
  getTopicProgress: (courseId: string, topicId: string) => Progress | undefined
  getMilestoneProgress: (courseId: string, milestoneId: string) => MilestoneProgress | undefined
  refreshProgress: () => Promise<void>
}

const ProgressContext = createContext<ProgressState>({
  progressMap: {},
  milestoneMap: {},
  loading: true,
  isTopicUnlocked: () => false,
  isMilestoneUnlocked: () => false,
  completeTopic: async () => {},
  completeMilestone: async () => {},
  getTopicProgress: () => undefined,
  getMilestoneProgress: () => undefined,
  refreshProgress: async () => {},
})

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { user, profile, refreshProfile } = useAuth()
  const [progressMap, setProgressMap] = useState<ProgressMap>({})
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

  const isTopicUnlocked = useCallback((courseId: string, topicId: string): boolean => {
    const allTopics = getCourseTopics(courseId)
    const idx = allTopics.findIndex(t => t.id === topicId)
    if (idx === 0) return true
    if (idx === -1) return false
    const prevTopic = allTopics[idx - 1]
    return progressMap[`${courseId}__${prevTopic.id}`]?.status === 'completed'
  }, [progressMap])

  const isMilestoneUnlocked = useCallback((courseId: string, milestoneId: string): boolean => {
    const course = getCourse(courseId)
    if (!course) return false
    const milestones = course.project.milestones
    const idx = milestones.findIndex(m => m.id === milestoneId)
    if (idx === 0) return true
    if (idx === -1) return false
    const prevMilestone = milestones[idx - 1]
    return milestoneMap[`${courseId}__${prevMilestone.id}`]?.status === 'completed'
  }, [milestoneMap])

  const completeTopic = useCallback(async (courseId: string, topicId: string, score: number) => {
    if (!user || !profile) return

    const allTopics = getCourseTopics(courseId)
    const topic = allTopics.find(t => t.id === topicId)
    if (!topic) return

    const key = `${courseId}__${topicId}`
    const existing = progressMap[key]
    const attempts = (existing?.attempts || 0) + 1

    await supabase.from('progress').upsert({
      user_id: user.id,
      course_id: courseId,
      topic_id: topicId,
      status: 'completed',
      score,
      attempts,
      completed_at: new Date().toISOString(),
    }, { onConflict: 'user_id,course_id,topic_id' })

    if (!existing || existing.status !== 'completed') {
      const { getStreakMultiplier, getLevelForXp } = await import('./gamification')
      const multiplier = getStreakMultiplier(profile.current_streak || 0)
      const xpEarned = Math.round(topic.xp * multiplier)
      const newXp = (profile.xp || 0) + xpEarned
      const newLevel = getLevelForXp(newXp).level

      const today = new Date().toISOString().split('T')[0]
      const lastActivity = profile.last_activity_date
      let newStreak = profile.current_streak || 0
      let longestStreak = profile.longest_streak || 0

      if (lastActivity !== today) {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]
        newStreak = lastActivity === yesterdayStr ? newStreak + 1 : 1
        longestStreak = Math.max(longestStreak, newStreak)
      }

      await supabase.from('profiles').update({
        xp: newXp,
        level: newLevel,
        current_streak: newStreak,
        longest_streak: longestStreak,
        last_activity_date: today,
      }).eq('id', user.id)

      await checkAndAwardBadges(user.id, courseId, topicId, score, attempts, newStreak)
    }

    await fetchProgress()
    await refreshProfile()
  }, [user, profile, progressMap, fetchProgress, refreshProfile])

  const completeMilestone = useCallback(async (courseId: string, milestoneId: string, score: number) => {
    if (!user || !profile) return

    const course = getCourse(courseId)
    const milestone = course?.project.milestones.find(m => m.id === milestoneId)
    if (!milestone) return

    const key = `${courseId}__${milestoneId}`
    const existing = milestoneMap[key]
    const attempts = (existing?.attempts || 0) + 1

    await supabase.from('milestone_progress').upsert({
      user_id: user.id,
      course_id: courseId,
      milestone_id: milestoneId,
      status: 'completed',
      score,
      attempts,
      completed_at: new Date().toISOString(),
    }, { onConflict: 'user_id,course_id,milestone_id' })

    if (!existing || existing.status !== 'completed') {
      const { getStreakMultiplier, getLevelForXp } = await import('./gamification')
      const multiplier = getStreakMultiplier(profile.current_streak || 0)
      const xpEarned = Math.round(milestone.xp * multiplier)
      const newXp = (profile.xp || 0) + xpEarned
      const newLevel = getLevelForXp(newXp).level

      const today = new Date().toISOString().split('T')[0]
      const lastActivity = profile.last_activity_date
      let newStreak = profile.current_streak || 0
      let longestStreak = profile.longest_streak || 0

      if (lastActivity !== today) {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]
        newStreak = lastActivity === yesterdayStr ? newStreak + 1 : 1
        longestStreak = Math.max(longestStreak, newStreak)
      }

      await supabase.from('profiles').update({
        xp: newXp, level: newLevel,
        current_streak: newStreak, longest_streak: longestStreak,
        last_activity_date: today,
      }).eq('id', user.id)

      // Check if entire course is now complete (all topics + all milestones)
      await checkCourseCompletion(user.id, courseId)
    }

    await fetchProgress()
    await refreshProfile()
  }, [user, profile, milestoneMap, fetchProgress, refreshProfile])

  const getTopicProgress = useCallback(
    (courseId: string, topicId: string) => progressMap[`${courseId}__${topicId}`],
    [progressMap]
  )

  const getMilestoneProgress = useCallback(
    (courseId: string, milestoneId: string) => milestoneMap[`${courseId}__${milestoneId}`],
    [milestoneMap]
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

async function checkCourseCompletion(userId: string, courseId: string) {
  const course = getCourse(courseId)
  if (!course) return

  const allTopicIds = getCourseTopics(courseId).map(t => t.id)
  const allMilestoneIds = course.project.milestones.map(m => m.id)

  const [{ data: topicData }, { data: milestoneData }] = await Promise.all([
    supabase.from('progress').select('topic_id').eq('user_id', userId).eq('course_id', courseId).eq('status', 'completed'),
    supabase.from('milestone_progress').select('milestone_id').eq('user_id', userId).eq('course_id', courseId).eq('status', 'completed'),
  ])

  const completedTopics = new Set(topicData?.map(p => p.topic_id) || [])
  const completedMilestones = new Set(milestoneData?.map(m => m.milestone_id) || [])

  const allTopicsDone = allTopicIds.every(id => completedTopics.has(id))
  const allMilestonesDone = allMilestoneIds.every(id => completedMilestones.has(id))

  if (allTopicsDone && allMilestonesDone) {
    const certificateId = `${courseId}-${userId.slice(0, 8)}-${Date.now().toString(36).toUpperCase()}`
    await supabase.from('certificates').upsert({
      certificate_id: certificateId,
      user_id: userId,
      course_id: courseId,
    }, { onConflict: 'user_id,course_id' })

    await Promise.all([
      // course-scoped certificate badge
      supabase.from('badges').upsert({
        user_id: userId,
        badge_type: `cert_${courseId}`,
        earned_at: new Date().toISOString(),
      }, { onConflict: 'user_id,badge_type' }),
      supabase.from('enrollments')
        .update({ completed_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('course_id', courseId),
    ])
  }
}

async function checkAndAwardBadges(
  userId: string, courseId: string, topicId: string,
  score: number, attempts: number, streak: number
) {
  const badges: string[] = []

  // first_lesson — fires exactly once: when the user's total completed topics (platform-wide) == 1
  const { count: totalCompletedCount } = await supabase
    .from('progress')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'completed')
  if ((totalCompletedCount ?? 0) === 1) badges.push('first_lesson')

  // chapter completion — course-scoped badge ID
  const chapterNum = parseInt(topicId.split('.')[0])
  const course = getCourse(courseId)
  if (course) {
    const chapter = course.chapters.find(c => c.id === chapterNum)
    if (chapter) {
      const { data: courseProgress } = await supabase
        .from('progress')
        .select('topic_id')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .eq('status', 'completed')

      const completedIds = new Set(courseProgress?.map(p => p.topic_id) || [])
      // include current topic (upsert already ran, but defensive)
      completedIds.add(topicId)

      if (chapter.topics.every(t => completedIds.has(t.id))) {
        badges.push(`chapter_${courseId}_${chapterNum}`)
      }

      // course_complete (topics only) — full completion (topics + milestones) handled in checkCourseCompletion
      const allTopics = getCourseTopics(courseId)
      if (allTopics.every(t => completedIds.has(t.id))) {
        badges.push(`course_complete_${courseId}`)
      }
    }
  }

  // halfway — global: total completed topics across ALL courses
  if ((totalCompletedCount ?? 0) >= 40) badges.push('halfway')

  if (score === 100) badges.push('perfect_quiz')
  if (attempts === 1 && score >= 70) badges.push('first_try')
  if (streak >= 3) badges.push('streak_3')
  if (streak >= 7) badges.push('streak_7')
  if (streak >= 14) badges.push('streak_14')
  if (streak >= 30) badges.push('streak_30')

  for (const badge of badges) {
    await supabase.from('badges').upsert({
      user_id: userId,
      badge_type: badge,
      earned_at: new Date().toISOString(),
    }, { onConflict: 'user_id,badge_type' })
  }
}

export const useProgress = () => useContext(ProgressContext)
