'use client'

import { useParams, useRouter } from 'next/navigation'
import { getCourse, getCourseTopics } from '@/data/curriculum'
import { useAuth } from '@/lib/auth-context'
import { useProgress } from '@/lib/progress-context'
import { useEnrollment } from '@/lib/enrollment-context'
import Sidebar from '@/components/Sidebar'
import Link from 'next/link'
import { CheckCircle, Lock, ChevronRight, Layers, Award, ArrowLeft } from 'lucide-react'
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
      <p className="text-gray-500">Course not found.</p>
    </main>
  )

  if (authLoading || !user) return (
    <main className="flex-1 flex items-center justify-center">
      <div className="animate-pulse text-gray-500">Loading…</div>
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
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <Link href="/courses" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200">
            <ArrowLeft className="w-4 h-4" />
            All Courses
          </Link>

          {/* Header */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">{course.icon}</span>
              <div>
                <h1 className="text-2xl font-bold text-white">{course.title}</h1>
                <p className="text-gray-400 text-sm">{course.tagline}</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500 mt-4 mb-1.5">
              <span>{completedTopics + completedMilestones} / {allTopics.length + course.project.milestones.length} items completed</span>
              <span>{overallPct}%</span>
            </div>
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${overallPct}%` }} />
            </div>
          </div>

          {/* Continue button */}
          {nextTopic && (
            <Link
              href={`/learn/${courseId}/${nextTopic.chapterId}/${nextTopic.id}`}
              className="flex items-center justify-between bg-emerald-900/30 border border-emerald-700/40 rounded-xl p-5 hover:border-emerald-600/60 transition-colors group"
            >
              <div>
                <p className="text-sm text-emerald-400 font-medium mb-0.5">Continue Learning</p>
                <p className="text-white font-semibold">{nextTopic.id}: {nextTopic.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">Ch.{nextTopic.chapterId}: {nextTopic.chapterTitle}</p>
              </div>
              <ChevronRight className="w-6 h-6 text-emerald-400 group-hover:translate-x-1 transition-transform" />
            </Link>
          )}

          {/* Chapters */}
          <div>
            <h2 className="text-lg font-bold text-white mb-4">Chapters</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {course.chapters.map((chapter) => {
                const done = chapter.topics.filter(t => progressMap[`${courseId}__${t.id}`]?.status === 'completed').length
                const pct = Math.round((done / chapter.topics.length) * 100)
                return (
                  <Link
                    key={chapter.id}
                    href={`/learn/${courseId}/${chapter.id}`}
                    className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-4 transition-colors"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xl">{chapter.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-emerald-400">{chapter.part}</p>
                        <h3 className="text-sm font-semibold text-white truncate">Ch.{chapter.id}: {chapter.title}</h3>
                      </div>
                      {pct === 100 && <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />}
                    </div>
                    <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5">{done}/{chapter.topics.length} completed</p>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Project */}
          <div>
            <h2 className="text-lg font-bold text-white mb-4">Capstone Project</h2>
            <Link
              href={`/learn/${courseId}/project`}
              className="block bg-amber-900/10 border border-amber-800/30 hover:border-amber-700/50 rounded-xl p-5 transition-colors"
            >
              <div className="flex items-start gap-4">
                <Layers className="w-8 h-8 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-bold text-white">{course.project.title}</h3>
                  <p className="text-sm text-gray-400 mt-1">{course.project.description.slice(0, 120)}…</p>
                  <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
                    <span>{completedMilestones}/{course.project.milestones.length} milestones</span>
                    <span>·</span>
                    <span>{course.project.milestones.reduce((s, m) => s + m.xp, 0)} XP</span>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Certificate */}
          {overallPct === 100 && (
            <div className="bg-amber-900/10 border border-amber-700/40 rounded-xl p-6 flex items-center gap-4">
              <Award className="w-8 h-8 text-amber-400 shrink-0" />
              <div>
                <h3 className="font-bold text-white">Certificate Earned!</h3>
                <p className="text-sm text-gray-400 mt-0.5">You've completed the entire course. Your certificate is ready.</p>
              </div>
              <Link href="/dashboard" className="ml-auto text-amber-400 hover:text-amber-300 text-sm font-medium whitespace-nowrap">
                View →
              </Link>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
