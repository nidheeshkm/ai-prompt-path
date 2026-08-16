'use client'

import { useAuth } from '@/lib/auth-context'
import { useProgress } from '@/lib/progress-context'
import { curriculum, getAllTopics } from '@/data/curriculum'
import { getLevelForXp, getXpProgress, getNextLevel, BADGE_DEFINITIONS } from '@/lib/gamification'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Flame, Trophy, Target, BookOpen, CheckCircle, Lock, ChevronRight, Zap } from 'lucide-react'

export default function DashboardPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const { progressMap, loading: progressLoading, isTopicUnlocked } = useProgress()
  const [earnedBadges, setEarnedBadges] = useState<string[]>([])
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth/login')
  }, [user, authLoading, router])

  useEffect(() => {
    if (!user) return
    supabase.from('badges').select('badge_type').eq('user_id', user.id).then(({ data }) => {
      setEarnedBadges(data?.map(b => b.badge_type) || [])
    })
  }, [user, progressMap])

  if (authLoading || progressLoading || !user || !profile) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    )
  }

  const allTopics = getAllTopics()
  const completedTopics = allTopics.filter(t => progressMap[t.id]?.status === 'completed')
  const completionPercent = Math.round((completedTopics.length / allTopics.length) * 100)
  const level = getLevelForXp(profile.xp)
  const xpProgress = getXpProgress(profile.xp)
  const nextLevel = getNextLevel(profile.xp)

  // Find next topic to study
  const nextTopic = allTopics.find(t => {
    if (progressMap[t.id]?.status === 'completed') return false
    return isTopicUnlocked(t.id)
  })
  const nextChapter = nextTopic ? curriculum.find(c => c.topics.some(t => t.id === nextTopic.id)) : null

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Welcome back, {profile.display_name}
          </h1>
          <p className="text-gray-400 mt-1">Continue your LangChain mastery journey</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<Zap className="w-5 h-5 text-emerald-400" />}
            label="Level"
            value={`${level.level} — ${level.title}`}
          />
          <StatCard
            icon={<Target className="w-5 h-5 text-blue-400" />}
            label="Total XP"
            value={profile.xp.toLocaleString()}
          />
          <StatCard
            icon={<Flame className="w-5 h-5 text-orange-400" />}
            label="Current Streak"
            value={`${profile.current_streak || 0} days`}
          />
          <StatCard
            icon={<BookOpen className="w-5 h-5 text-purple-400" />}
            label="Completed"
            value={`${completedTopics.length} / ${allTopics.length}`}
          />
        </div>

        {/* XP Progress */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-300">
              Level {level.level}: {level.title}
            </span>
            {nextLevel && (
              <span className="text-sm text-gray-500">
                {xpProgress.current} / {xpProgress.needed} XP to Level {nextLevel.level}
              </span>
            )}
          </div>
          <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-700"
              style={{ width: `${xpProgress.percentage}%` }}
            />
          </div>
        </div>

        {/* Continue Learning */}
        {nextTopic && nextChapter && (
          <Link
            href={`/learn/${nextChapter.id}/${nextTopic.id}`}
            className="block bg-gradient-to-r from-emerald-900/40 to-emerald-800/20 border border-emerald-700/40 rounded-xl p-6 hover:border-emerald-600/60 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-400 font-medium mb-1">Continue Learning</p>
                <h3 className="text-lg font-semibold text-white">{nextTopic.id}: {nextTopic.title}</h3>
                <p className="text-sm text-gray-400 mt-1">Chapter {nextChapter.id}: {nextChapter.title}</p>
              </div>
              <ChevronRight className="w-6 h-6 text-emerald-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        )}

        {/* Course Map */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4">Course Progress</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {curriculum.map((chapter) => {
              const chapterCompleted = chapter.topics.filter(t => progressMap[t.id]?.status === 'completed').length
              const chapterPercent = Math.round((chapterCompleted / chapter.topics.length) * 100)
              const chapterUnlocked = chapter.topics.some(t => isTopicUnlocked(t.id))

              return (
                <Link
                  key={chapter.id}
                  href={chapterUnlocked ? `/learn/${chapter.id}` : '#'}
                  className={`bg-gray-900 border rounded-xl p-5 transition-colors ${
                    chapterUnlocked
                      ? 'border-gray-800 hover:border-gray-700 cursor-pointer'
                      : 'border-gray-800/50 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{chapter.icon}</span>
                      <div>
                        <h3 className="font-semibold text-white text-sm">Ch.{chapter.id}: {chapter.title}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">{chapter.topics.length} topics</p>
                      </div>
                    </div>
                    {!chapterUnlocked && <Lock className="w-4 h-4 text-gray-600" />}
                    {chapterPercent === 100 && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                  </div>
                  <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${chapterPercent}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{chapterCompleted}/{chapter.topics.length} completed</p>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Badges */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4">Badges</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {BADGE_DEFINITIONS.map((badge) => {
              const earned = earnedBadges.includes(badge.id)
              return (
                <div
                  key={badge.id}
                  className={`flex flex-col items-center p-3 rounded-xl border text-center ${
                    earned
                      ? 'bg-gray-800 border-emerald-700/40'
                      : 'bg-gray-900 border-gray-800 opacity-40'
                  }`}
                  title={badge.description}
                >
                  <span className="text-2xl mb-1">{badge.icon}</span>
                  <span className="text-xs font-medium text-gray-300 leading-tight">{badge.name}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </main>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-lg font-bold text-white">{value}</p>
    </div>
  )
}
