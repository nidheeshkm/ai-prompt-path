'use client'

import { useAuth } from '@/lib/auth-context'
import { useProgress } from '@/lib/progress-context'
import { useEnrollment } from '@/lib/enrollment-context'
import { courses, getCourseTopics } from '@/data/curriculum'
import { getAllBadgeDefinitions, getCourseLevel, getCoursePace, type PaceLabel } from '@/lib/gamification'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Flame, Target, BookOpen, CheckCircle, ChevronRight, Zap, Award, Plus, AlertTriangle, Lock, TrendingUp } from 'lucide-react'

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
        <div className="animate-pulse text-slate-400 text-sm">Loading…</div>
      </div>
    )
  }

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
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            Welcome back, <span className="gradient-text">{profile.display_name}</span>
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Keep up the momentum.</p>
        </div>

        {/* OpenRouter key banner */}
        {!profile.has_api_key && (
          <div className="flex items-start gap-4 bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-amber-800 mb-0.5">Set up your OpenRouter key to start learning</p>
              <p className="text-sm text-amber-700/80">
                All AI-powered assessments require your own free OpenRouter key — add it once in Settings.
              </p>
            </div>
            <Link
              href="/settings"
              className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors"
            >
              Configure →
            </Link>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            gradient="from-amber-500 to-orange-500"
            icon={<Zap className="w-5 h-5 text-white" />}
            label="Total XP"
            value={profile.xp.toLocaleString()}
            sub="across all courses"
          />
          <StatCard
            gradient="from-orange-500 to-red-500"
            icon={<Flame className="w-5 h-5 text-white" />}
            label="Streak"
            value={`${profile.current_streak || 0}`}
            sub="days in a row"
          />
          <StatCard
            gradient="from-violet-500 to-purple-600"
            icon={<TrendingUp className="w-5 h-5 text-white" />}
            label="Best Streak"
            value={`${profile.longest_streak || 0}`}
            sub="days"
          />
          <StatCard
            gradient="from-emerald-500 to-cyan-500"
            icon={<BookOpen className="w-5 h-5 text-white" />}
            label="Topics Done"
            value={`${totalCompleted}`}
            sub={`of ${totalTopics} enrolled`}
          />
        </div>

        {/* Certificates */}
        {certificates.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-4">Certificates</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {certificates.map(cert => {
                const course = courses.find(c => c.id === cert.course_id)
                if (!course) return null
                return (
                  <Link
                    key={cert.id}
                    href={`/certificates/${cert.id}`}
                    className="flex items-center gap-4 glass rounded-xl p-4 hover:border-amber-200 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
                      <Award className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm">{course.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Issued {new Date(cert.issued_at).toLocaleDateString()}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-amber-500 group-hover:translate-x-0.5 transition-transform shrink-0" />
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* My Courses */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">My Courses</h2>
            <Link
              href="/courses"
              className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Browse Catalog
            </Link>
          </div>

          {enrolledCourses.length === 0 ? (
            <div className="glass rounded-2xl p-10 text-center">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 mb-5 text-sm">You haven't enrolled in any courses yet.</p>
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-500/20"
              >
                Browse Courses
              </Link>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {enrolledCourses.map((course, i) => {
                const allTopics = getCourseTopics(course.id)
                const completedTopicEntries = allTopics.filter(t => progressMap[`${course.id}__${t.id}`]?.status === 'completed')
                const completedMilestones = course.project.milestones.filter(
                  m => milestoneMap[`${course.id}__${m.id}`]?.status === 'completed'
                ).length
                const total = allTopics.length + course.project.milestones.length
                const done = completedTopicEntries.length + completedMilestones
                const pct = total > 0 ? Math.round((done / total) * 100) : 0
                const hasCert = certificates.some(c => c.course_id === course.id)
                const nextTopic = allTopics.find(t => progressMap[`${course.id}__${t.id}`]?.status !== 'completed')
                const gradient = COURSE_GRADIENTS[i % COURSE_GRADIENTS.length]

                // Learning pace
                const enrollment = enrollments.find(e => e.course_id === course.id)
                const remainingTopics = allTopics.filter(t => progressMap[`${course.id}__${t.id}`]?.status !== 'completed')
                const remainingMilestones = course.project.milestones.filter(
                  m => milestoneMap[`${course.id}__${m.id}`]?.status !== 'completed'
                )
                const pace = enrollment
                  ? getCoursePace(
                      enrollment.enrolled_at,
                      completedTopicEntries,
                      remainingTopics,
                      completedMilestones,
                      remainingMilestones.length,
                    )
                  : null

                // Per-course XP and level
                const totalCourseXp = allTopics.reduce((s, t) => s + t.xp, 0)
                  + course.project.milestones.reduce((s, m) => s + m.xp, 0)
                const earnedCourseXp = completedTopicEntries.reduce((s, t) => {
                  const topic = allTopics.find(at => at.id === t.id)
                  return s + (topic?.xp ?? 0)
                }, 0) + course.project.milestones.filter(
                  m => milestoneMap[`${course.id}__${m.id}`]?.status === 'completed'
                ).reduce((s, m) => s + m.xp, 0)
                const courseLevel = getCourseLevel(earnedCourseXp, totalCourseXp, course.levelTitles)

                return (
                  <div key={course.id} className="glass rounded-2xl overflow-hidden flex flex-col">
                    {/* Gradient header strip */}
                    <div className={`h-1.5 bg-gradient-to-r ${gradient}`} />

                    <div className="p-5 flex flex-col gap-4 flex-1">
                      {/* Course title row */}
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-xl shrink-0 shadow-md`}>
                          {course.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-slate-900 text-sm leading-tight truncate">{course.title}</h3>
                          <p className="text-xs text-slate-400 mt-0.5">{done}/{total} completed · {pct}%</p>
                        </div>
                        {hasCert && (
                          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                            <Award className="w-4 h-4 text-amber-500" />
                          </div>
                        )}
                      </div>

                      {/* Course level badge + XP bar */}
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${gradient} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}>
                              {courseLevel.tier}
                            </div>
                            <span className="text-xs font-semibold text-slate-800">{courseLevel.title}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {earnedCourseXp.toLocaleString()} / {totalCourseXp.toLocaleString()} XP
                          </span>
                        </div>
                        {/* Progress bar */}
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mb-2">
                          <div
                            className={`h-full bg-gradient-to-r ${gradient} rounded-full transition-all`}
                            style={{ width: `${courseLevel.fillPct}%` }}
                          />
                        </div>
                        {/* 5-tier dots roadmap */}
                        <div className="flex items-center gap-1">
                          {course.levelTitles.map((title, idx) => {
                            const reached = courseLevel.tier > idx + 1
                            const current = courseLevel.tier === idx + 1
                            return (
                              <div key={idx} className="flex-1 flex flex-col items-center gap-0.5" title={title}>
                                <div className={`w-2 h-2 rounded-full transition-all ${
                                  reached ? 'bg-emerald-400'
                                  : current ? `bg-gradient-to-br ${gradient}`
                                  : 'bg-slate-200'
                                }`} />
                                <span className={`text-[8px] leading-none text-center truncate w-full text-center ${
                                  current ? 'text-slate-700 font-semibold' : 'text-slate-400'
                                }`}>
                                  {title.split(' ').pop()}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                        {courseLevel.nextTitle && courseLevel.xpToNext > 0 && (
                          <p className="text-[10px] text-slate-400 mt-1.5">
                            {courseLevel.xpToNext} XP to <span className="text-slate-600 font-medium">{courseLevel.nextTitle}</span>
                          </p>
                        )}
                        {!courseLevel.nextTitle && (
                          <p className="text-[10px] text-emerald-600 font-semibold mt-1.5">🏆 Max level reached!</p>
                        )}
                      </div>

                      {/* Learning pace meter */}
                      {pace && <PaceMeter pace={pace} />}

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
                                  ? 'bg-slate-50 hover:bg-slate-100 cursor-pointer border border-slate-200'
                                  : 'bg-slate-50 opacity-50 cursor-not-allowed border border-slate-100'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                {unlocked ? (
                                  <span className="shrink-0">{chapter.icon}</span>
                                ) : (
                                  <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                                )}
                                <span className="text-slate-600 truncate">Ch.{chapter.id}</span>
                              </div>
                              {chPct === 100
                                ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                : <span className="text-slate-400 shrink-0 ml-1">{chPct}%</span>
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
                            className="flex items-center justify-center w-full border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-700 text-xs font-medium px-4 py-2.5 rounded-xl transition-all"
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
          <h2 className="text-lg font-bold text-slate-900 mb-4">Badges</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {getAllBadgeDefinitions(enrolledCourses).map((badge) => {
              const earned = earnedBadges.includes(badge.id)
              return (
                <div
                  key={badge.id}
                  className={`flex flex-col items-center p-3 rounded-xl border text-center transition-all ${
                    earned
                      ? 'glass border-emerald-200 shadow-sm'
                      : 'bg-slate-50 border-slate-100 opacity-40'
                  }`}
                  title={badge.description}
                >
                  <span className="text-2xl mb-1">{badge.icon}</span>
                  <span className="text-xs font-medium text-slate-600 leading-tight">{badge.name}</span>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </main>
  )
}

const PACE_CONFIG: Record<PaceLabel, {
  emoji: string; label: string; color: string; bg: string; border: string; barPct: number
}> = {
  'not-started': { emoji: '🆕', label: 'Not started yet',  color: 'text-slate-500',   bg: 'bg-slate-50',   border: 'border-slate-200', barPct: 0   },
  'paused':      { emoji: '⏸️', label: 'Paused',           color: 'text-slate-500',   bg: 'bg-slate-50',   border: 'border-slate-200', barPct: 8   },
  'slow':        { emoji: '🐢', label: 'Slow pace',         color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200', barPct: 28  },
  'steady':      { emoji: '🚶', label: 'Steady pace',       color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-200',  barPct: 55  },
  'fast':        { emoji: '🚀', label: 'Fast pace',         color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', barPct: 80 },
  'blazing':     { emoji: '⚡', label: 'Blazing',           color: 'text-purple-600',  bg: 'bg-purple-50',  border: 'border-purple-200', barPct: 100 },
}

function PaceMeter({ pace }: { pace: ReturnType<typeof getCoursePace> }) {
  const cfg = PACE_CONFIG[pace.label]

  const completionLine = (() => {
    if (pace.label === 'not-started') return 'Complete your first topic to estimate a finish date.'
    if (pace.estimatedDate === null)  return 'Keep going — finish date will appear soon.'
    if (pace.estimatedDays === 0)     return '🎉 Course complete!'
    const date = pace.estimatedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    const days = pace.estimatedDays
    const qualifier = pace.label === 'slow' || pace.label === 'paused' ? 'At current pace' : 'On track'
    return `${qualifier} to finish by ${date} (${days} days)`
  })()

  return (
    <div className={`rounded-xl border p-3 ${cfg.bg} ${cfg.border}`}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-sm leading-none">{cfg.emoji}</span>
          <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
        </div>
        {pace.label !== 'not-started' && (
          <span className="text-[10px] text-slate-400">
            {pace.topicsPerWeek < 0.1 ? '< 0.1' : pace.topicsPerWeek.toFixed(1)} topics/week
          </span>
        )}
      </div>

      {/* Speed track */}
      <div className="relative w-full h-2 bg-white/70 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            pace.label === 'blazing' ? 'bg-purple-500' :
            pace.label === 'fast'    ? 'bg-emerald-500' :
            pace.label === 'steady'  ? 'bg-blue-500' :
            pace.label === 'slow'    ? 'bg-amber-500' :
            'bg-slate-300'
          }`}
          style={{ width: `${cfg.barPct}%` }}
        />
        {/* Tick marks */}
        {[28, 55, 80].map(p => (
          <div key={p} className="absolute top-0 bottom-0 w-px bg-white/60" style={{ left: `${p}%` }} />
        ))}
      </div>

      {/* Slow → Blazing labels */}
      <div className="flex justify-between text-[9px] text-slate-400 mb-2">
        <span>🐢 Slow</span>
        <span>🚶 Steady</span>
        <span>🚀 Fast</span>
        <span>⚡ Blazing</span>
      </div>

      {/* Completion estimate */}
      <p className="text-[10px] text-slate-500 leading-relaxed">{completionLine}</p>

      {/* Context line */}
      {pace.label !== 'not-started' && (
        <p className="text-[10px] text-slate-400 mt-0.5">
          {pace.completedCount} of {pace.totalCount} items done · enrolled {pace.daysEnrolled}d ago
          {(pace.label === 'paused' || pace.label === 'slow') && (
            <span className="text-amber-500"> · Pick up the pace to finish sooner</span>
          )}
        </p>
      )}
    </div>
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
      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-xl font-bold text-slate-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}
