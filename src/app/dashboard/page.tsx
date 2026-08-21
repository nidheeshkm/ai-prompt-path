'use client'

import { useAuth } from '@/lib/auth-context'
import { useProgress } from '@/lib/progress-context'
import { useEnrollment } from '@/lib/enrollment-context'
import { courses, getCourseTopics } from '@/data/curriculum'
import { getLevelForXp, getXpProgress, getNextLevel, getAllBadgeDefinitions } from '@/lib/gamification'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Flame, Target, BookOpen, CheckCircle, ChevronRight, Zap, Award, Plus, AlertTriangle, Lock } from 'lucide-react'

const COURSE_GRADIENTS = [
  'from-emerald-500 to-cyan-500',
  'from-violet-500 to-purple-600',
  'from-orange-500 to-amber-500',
  'from-blue-500 to-cyan-500',
  'from-rose-500 to-pink-500',
  'from-teal-500 to-emerald-600',
]

export default function DashboardPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const { progressMap, milestoneMap } = useProgress()
  const { enrollments, certificates, loading: enrollLoading } = useEnrollment()
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

  if (authLoading || enrollLoading || !user || !profile) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-white/30 text-sm">Loading…</div>
      </div>
    )
  }

  const level = getLevelForXp(profile.xp)
  const xpProgress = getXpProgress(profile.xp)
  const nextLevel = getNextLevel(profile.xp)

  const enrolledCourses = courses.filter(c => enrollments.some(e => e.course_id === c.id))
  const totalCompleted = enrolledCourses.reduce((sum, course) => {
    const topics = getCourseTopics(course.id)
    return sum + topics.filter(t => progressMap[`${course.id}__${t.id}`]?.status === 'completed').length
  }, 0)
  const totalTopics = enrolledCourses.reduce((sum, c) => sum + getCourseTopics(c.id).length, 0)

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Welcome */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Welcome back, <span className="gradient-text">{profile.display_name}</span>
          </h1>
          <p className="text-white/40 mt-1 text-sm">Keep up the momentum.</p>
        </div>

        {/* OpenRouter key banner */}
        {!profile.has_openrouter_key && (
          <div className="flex items-start gap-4 bg-amber-500/[0.08] border border-amber-500/25 rounded-2xl p-5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-amber-300 mb-0.5">Set up your OpenRouter key to start learning</p>
              <p className="text-sm text-amber-200/60">
                All AI-powered assessments require your own free OpenRouter key — add it once in Settings.
              </p>
            </div>
            <Link
              href="/settings"
              className="shrink-0 bg-amber-500 hover:bg-amber-400 text-gray-900 text-sm font-bold px-4 py-2 rounded-xl transition-colors"
            >
              Configure →
            </Link>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            gradient="from-violet-500 to-purple-600"
            icon={<Zap className="w-5 h-5 text-white" />}
            label="Level"
            value={String(level.level)}
            sub={level.title}
          />
          <StatCard
            gradient="from-amber-500 to-orange-500"
            icon={<Target className="w-5 h-5 text-white" />}
            label="Total XP"
            value={profile.xp.toLocaleString()}
            sub="experience points"
          />
          <StatCard
            gradient="from-orange-500 to-red-500"
            icon={<Flame className="w-5 h-5 text-white" />}
            label="Streak"
            value={`${profile.current_streak || 0}`}
            sub="days in a row"
          />
          <StatCard
            gradient="from-emerald-500 to-cyan-500"
            icon={<BookOpen className="w-5 h-5 text-white" />}
            label="Topics Done"
            value={`${totalCompleted}`}
            sub={`of ${totalTopics}`}
          />
        </div>

        {/* XP Progress bar */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                {level.level}
              </div>
              <span className="text-sm font-semibold text-white">{level.title}</span>
            </div>
            {nextLevel && (
              <span className="text-xs text-white/30">
                {xpProgress.current} / {xpProgress.needed} XP to Level {nextLevel.level}
              </span>
            )}
          </div>
          <div className="w-full h-3 bg-white/[0.08] rounded-full overflow-hidden">
            <div
              className="xp-bar h-full rounded-full transition-all duration-700"
              style={{ width: `${xpProgress.percentage}%` }}
            />
          </div>
        </div>

        {/* Certificates */}
        {certificates.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-white mb-4">Certificates</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {certificates.map(cert => {
                const course = courses.find(c => c.id === cert.course_id)
                if (!course) return null
                return (
                  <Link
                    key={cert.id}
                    href={`/certificates/${cert.certificate_id}`}
                    className="flex items-center gap-4 glass rounded-xl p-4 hover:border-amber-500/30 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
                      <Award className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm">{course.title}</p>
                      <p className="text-xs text-white/30 mt-0.5">
                        Issued {new Date(cert.issued_at).toLocaleDateString()}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-amber-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* My Courses */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">My Courses</h2>
            <Link
              href="/courses"
              className="flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Browse Catalog
            </Link>
          </div>

          {enrolledCourses.length === 0 ? (
            <div className="glass rounded-2xl p-10 text-center">
              <BookOpen className="w-10 h-10 text-white/10 mx-auto mb-3" />
              <p className="text-white/40 mb-5 text-sm">You haven't enrolled in any courses yet.</p>
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-500/25"
              >
                Browse Courses
              </Link>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {enrolledCourses.map((course, i) => {
                const allTopics = getCourseTopics(course.id)
                const completedTopics = allTopics.filter(t => progressMap[`${course.id}__${t.id}`]?.status === 'completed').length
                const completedMilestones = course.project.milestones.filter(
                  m => milestoneMap[`${course.id}__${m.id}`]?.status === 'completed'
                ).length
                const total = allTopics.length + course.project.milestones.length
                const done = completedTopics + completedMilestones
                const pct = total > 0 ? Math.round((done / total) * 100) : 0
                const hasCert = certificates.some(c => c.course_id === course.id)
                const nextTopic = allTopics.find(t => progressMap[`${course.id}__${t.id}`]?.status !== 'completed')
                const gradient = COURSE_GRADIENTS[i % COURSE_GRADIENTS.length]

                return (
                  <div key={course.id} className="glass rounded-2xl overflow-hidden flex flex-col">
                    {/* Gradient header strip */}
                    <div className={`h-1.5 bg-gradient-to-r ${gradient}`} />

                    <div className="p-5 flex flex-col gap-4 flex-1">
                      {/* Course title row */}
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-xl shrink-0 shadow-lg`}>
                          {course.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-white text-sm leading-tight truncate">{course.title}</h3>
                          <p className="text-xs text-white/30 mt-0.5">{done}/{total} completed · {pct}%</p>
                        </div>
                        {hasCert && (
                          <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                            <Award className="w-4 h-4 text-amber-400" />
                          </div>
                        )}
                      </div>

                      {/* Progress bar */}
                      <div className="w-full h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${gradient} rounded-full transition-all`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      {/* Chapter chips */}
                      <div className="grid gap-1.5 grid-cols-2">
                        {course.chapters.map(chapter => {
                          const chDone = chapter.topics.filter(t => progressMap[`${course.id}__${t.id}`]?.status === 'completed').length
                          const chPct = Math.round((chDone / chapter.topics.length) * 100)
                          const unlocked = chapter.topics.some(t => {
                            const idx = allTopics.findIndex(at => at.id === t.id)
                            if (idx === 0) return true
                            return progressMap[`${course.id}__${allTopics[idx - 1]?.id}`]?.status === 'completed'
                          })
                          return (
                            <Link
                              key={chapter.id}
                              href={unlocked ? `/learn/${course.id}/${chapter.id}` : '#'}
                              className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors ${
                                unlocked
                                  ? 'bg-white/[0.04] hover:bg-white/[0.08] cursor-pointer'
                                  : 'bg-white/[0.02] opacity-40 cursor-not-allowed'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                {unlocked ? (
                                  <span className="shrink-0">{chapter.icon}</span>
                                ) : (
                                  <Lock className="w-3 h-3 text-white/20 shrink-0" />
                                )}
                                <span className="text-white/60 truncate">Ch.{chapter.id}</span>
                              </div>
                              {chPct === 100
                                ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                : <span className="text-white/30 shrink-0 ml-1">{chPct}%</span>
                              }
                            </Link>
                          )
                        })}
                      </div>

                      {/* CTA */}
                      <div className="mt-auto">
                        {nextTopic ? (
                          <Link
                            href={`/learn/${course.id}/${nextTopic.chapterId}/${nextTopic.id}`}
                            className={`flex items-center justify-between w-full bg-gradient-to-r ${gradient} text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md group`}
                          >
                            <span>Continue: {nextTopic.title}</span>
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                          </Link>
                        ) : (
                          <Link
                            href={`/learn/${course.id}`}
                            className="flex items-center justify-center w-full border border-white/10 hover:border-white/20 text-white/50 hover:text-white/80 text-xs font-medium px-4 py-2.5 rounded-xl transition-all"
                          >
                            View Course
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Badges */}
        <section>
          <h2 className="text-lg font-bold text-white mb-4">Badges</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {getAllBadgeDefinitions(enrolledCourses).map((badge) => {
              const earned = earnedBadges.includes(badge.id)
              return (
                <div
                  key={badge.id}
                  className={`flex flex-col items-center p-3 rounded-xl border text-center transition-all ${
                    earned
                      ? 'glass border-emerald-500/20 shadow-lg shadow-emerald-500/5'
                      : 'bg-white/[0.02] border-white/[0.04] opacity-30'
                  }`}
                  title={badge.description}
                >
                  <span className="text-2xl mb-1">{badge.icon}</span>
                  <span className="text-xs font-medium text-white/70 leading-tight">{badge.name}</span>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </main>
  )
}

function StatCard({
  gradient,
  icon,
  label,
  value,
  sub,
}: {
  gradient: string
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="glass rounded-2xl p-4 flex flex-col gap-3">
      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-white/40 uppercase tracking-wider">{label}</p>
        <p className="text-xl font-bold text-white leading-tight">{value}</p>
        {sub && <p className="text-xs text-white/30 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}
