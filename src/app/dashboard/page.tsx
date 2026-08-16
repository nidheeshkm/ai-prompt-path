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
import { Flame, Target, BookOpen, CheckCircle, ChevronRight, Zap, Award, Plus } from 'lucide-react'

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
        <div className="animate-pulse text-gray-500">Loading...</div>
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
            Welcome back, {profile.display_name}
          </h1>
          <p className="text-gray-400 mt-1">Keep up the momentum.</p>
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
            label="Streak"
            value={`${profile.current_streak || 0} days`}
          />
          <StatCard
            icon={<BookOpen className="w-5 h-5 text-purple-400" />}
            label="Topics Done"
            value={`${totalCompleted} / ${totalTopics}`}
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

        {/* Certificates */}
        {certificates.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-white mb-4">Certificates</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {certificates.map(cert => {
                const course = courses.find(c => c.id === cert.course_id)
                if (!course) return null
                return (
                  <Link
                    key={cert.id}
                    href={`/certificates/${cert.certificate_id}`}
                    className="flex items-center gap-4 bg-amber-900/10 border border-amber-700/40 hover:border-amber-600/60 rounded-xl p-4 transition-colors group"
                  >
                    <Award className="w-8 h-8 text-amber-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white">{course.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Issued {new Date(cert.issued_at).toLocaleDateString()}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* My Courses */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">My Courses</h2>
            <Link href="/courses" className="flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300">
              <Plus className="w-4 h-4" />
              Browse Catalog
            </Link>
          </div>

          {enrolledCourses.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
              <BookOpen className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 mb-4">You haven't enrolled in any courses yet.</p>
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
              >
                Browse Courses
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {enrolledCourses.map(course => {
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

                return (
                  <div key={course.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-2xl">{course.icon}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate">{course.title}</h3>
                        <p className="text-xs text-gray-500">{done}/{total} completed · {pct}%</p>
                      </div>
                      {hasCert && <Award className="w-5 h-5 text-amber-400 shrink-0" />}
                    </div>
                    <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden mb-4">
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>

                    <div className="grid gap-2 md:grid-cols-2 mb-4">
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
                            className={`flex items-center justify-between bg-gray-800 rounded-lg p-2.5 text-xs transition-colors ${
                              unlocked ? 'hover:bg-gray-700 cursor-pointer' : 'opacity-50 cursor-not-allowed'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span>{chapter.icon}</span>
                              <span className="text-gray-300 truncate">Ch.{chapter.id}: {chapter.title}</span>
                            </div>
                            {chPct === 100 ? (
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            ) : (
                              <span className="text-gray-500 shrink-0 ml-1">{chPct}%</span>
                            )}
                          </Link>
                        )
                      })}
                    </div>

                    {nextTopic ? (
                      <Link
                        href={`/learn/${course.id}/${nextTopic.chapterId}/${nextTopic.id}`}
                        className="flex items-center justify-between w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors group"
                      >
                        <span>Continue: {nextTopic.title}</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    ) : (
                      <Link
                        href={`/learn/${course.id}`}
                        className="flex items-center justify-center w-full border border-gray-700 hover:border-gray-600 text-gray-300 text-xs font-medium px-3 py-2 rounded-lg transition-colors"
                      >
                        View Course
                      </Link>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Badges */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4">Badges</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {getAllBadgeDefinitions(enrolledCourses).map((badge) => {
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
