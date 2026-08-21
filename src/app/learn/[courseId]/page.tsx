'use client'

import { useParams, useRouter } from 'next/navigation'
import { getCourse, getCourseTopics } from '@/data/curriculum'
import { useAuth } from '@/lib/auth-context'
import { useProgress } from '@/lib/progress-context'
import { useEnrollment } from '@/lib/enrollment-context'
import Sidebar from '@/components/Sidebar'
import Link from 'next/link'
import { CheckCircle, ChevronRight, Layers, Award, ArrowLeft } from 'lucide-react'
import { useEffect } from 'react'

export default function CourseOverviewPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const { user, loading: authLoading } = useAuth()
  const { progressMap, milestoneMap } = useProgress()
  const { isEnrolled } = useEnrollment()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth/login')
  }, [user, authLoading, router])

  const course = getCourse(courseId)
  if (!course) return (
    <main className="flex-1 flex items-center justify-center">
      <p className="text-slate-400">Course not found.</p>
    </main>
  )

  if (authLoading || !user) return (
    <main className="flex-1 flex items-center justify-center">
      <div className="animate-pulse text-slate-400 text-sm">Loading…</div>
    </main>
  )

  if (!isEnrolled(courseId)) {
    router.replace(`/courses/${courseId}`)
    return null
  }

  const allTopics = getCourseTopics(courseId)
  const completedTopics = allTopics.filter(t => progressMap[`${courseId}__${t.id}`]?.status === 'completed').length
  const completedMilestones = course.project.milestones.filter(m => milestoneMap[`${courseId}__${m.id}`]?.status === 'completed').length
  const overallPct = Math.round(
    ((completedTopics + completedMilestones) / (allTopics.length + course.project.milestones.length)) * 100
  )
  const nextTopic = allTopics.find(t => progressMap[`${courseId}__${t.id}`]?.status !== 'completed')

  return (
    <>
      <Sidebar courseId={courseId} />
      <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-8">

          <Link href="/courses" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            All Courses
          </Link>

          {/* Header */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{course.icon}</span>
              <div>
                <h1 className="text-xl font-bold text-slate-900">{course.title}</h1>
                <p className="text-slate-500 text-sm">{course.tagline}</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
              <span>{completedTopics + completedMilestones} / {allTopics.length + course.project.milestones.length} items completed</span>
              <span className="font-semibold text-slate-600">{overallPct}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-700"
                style={{ width: `${overallPct}%` }}
              />
            </div>
          </div>

          {/* Continue button */}
          {nextTopic && (
            <Link
              href={`/learn/${courseId}/${nextTopic.chapterId}/${nextTopic.id}`}
              className="flex items-center justify-between glass rounded-2xl p-5 hover:border-emerald-300 hover:shadow-md transition-all group"
            >
              <div>
                <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wide mb-0.5">Continue Learning</p>
                <p className="text-slate-900 font-bold">{nextTopic.id}: {nextTopic.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">Ch.{nextTopic.chapterId}: {nextTopic.chapterTitle}</p>
              </div>
              <ChevronRight className="w-6 h-6 text-emerald-500 group-hover:translate-x-1 transition-transform shrink-0" />
            </Link>
          )}

          {/* Chapters */}
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-4">Chapters</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {course.chapters.map((chapter) => {
                const done = chapter.topics.filter(t => progressMap[`${courseId}__${t.id}`]?.status === 'completed').length
                const pct = Math.round((done / chapter.topics.length) * 100)
                return (
                  <Link
                    key={chapter.id}
                    href={`/learn/${courseId}/${chapter.id}`}
                    className="glass rounded-xl p-4 hover:shadow-md hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xl">{chapter.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-emerald-600 font-medium">{chapter.part}</p>
                        <h3 className="text-sm font-semibold text-slate-900 leading-snug">Ch.{chapter.id}: {chapter.title}</h3>
                      </div>
                      {pct === 100 && <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />}
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5">{done}/{chapter.topics.length} completed</p>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Capstone Project */}
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-4">Capstone Project</h2>
            <Link
              href={`/learn/${courseId}/project`}
              className="glass rounded-2xl p-5 flex items-start gap-4 hover:border-amber-200 hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                <Layers className="w-6 h-6 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-900">{course.project.title}</h3>
                <p className="text-sm text-slate-500 mt-1">{course.project.description.slice(0, 120)}…</p>
                <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
                  <span>{completedMilestones}/{course.project.milestones.length} milestones</span>
                  <span>·</span>
                  <span>{course.project.milestones.reduce((s, m) => s + m.xp, 0)} XP</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
            </Link>
          </div>

          {/* Certificate */}
          {overallPct === 100 && (
            <div className="glass rounded-2xl p-6 flex items-center gap-4 border-amber-200">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
                <Award className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Certificate Earned!</h3>
                <p className="text-sm text-slate-500 mt-0.5">You've completed the entire course. Your certificate is ready.</p>
              </div>
              <Link href="/dashboard" className="ml-auto text-amber-600 hover:text-amber-700 text-sm font-semibold whitespace-nowrap">
                View →
              </Link>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
