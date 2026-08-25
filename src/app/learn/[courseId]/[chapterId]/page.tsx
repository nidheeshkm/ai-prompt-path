'use client'

import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useProgress } from '@/lib/progress-context'
import { useEnrollment } from '@/lib/enrollment-context'
import { getCourse } from '@/data/curriculum'
import Link from 'next/link'
import { CheckCircle, Lock, Circle, ChevronRight, ArrowLeft, Zap } from 'lucide-react'
import { useEffect } from 'react'
import Sidebar from '@/components/Sidebar'

export default function ChapterPage() {
  const { courseId, chapterId } = useParams<{ courseId: string; chapterId: string }>()
  const { user, loading: authLoading } = useAuth()
  const { progressMap, isTopicUnlocked } = useProgress()
  const { isEnrolled, loading: enrollLoading } = useEnrollment()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth/login')
  }, [user, authLoading, router])

  const course = getCourse(courseId)
  const chapter = course?.chapters.find(c => c.id === Number(chapterId))

  if (authLoading || enrollLoading || !user) return (
    <main className="flex-1 flex items-center justify-center">
      <div className="animate-pulse text-slate-400 text-sm">Loading…</div>
    </main>
  )

  if (!course || !chapter) return (
    <main className="flex-1 flex items-center justify-center">
      <p className="text-slate-400">Chapter not found.</p>
    </main>
  )

  if (!isEnrolled(courseId)) {
    router.replace(`/courses/${courseId}`)
    return null
  }

  const completedCount = chapter.topics.filter(t => progressMap[`${courseId}__${t.id}`]?.status === 'completed').length
  const totalXp = chapter.topics.reduce((sum, t) => sum + t.xp, 0)
  const chapterNum = Number(chapterId)
  const pct = chapter.topics.length > 0 ? Math.round((completedCount / chapter.topics.length) * 100) : 0

  return (
    <>
      <Sidebar courseId={courseId} />
      <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-8">
        <div className="max-w-3xl mx-auto">

          <Link
            href={`/learn/${courseId}`}
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Course
          </Link>

          {/* Chapter header */}
          <div className="glass rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{chapter.icon}</span>
              <div>
                <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wide">{chapter.part}</p>
                <h1 className="text-xl font-bold text-slate-900">Chapter {chapter.id}: {chapter.title}</h1>
              </div>
            </div>
            <p className="text-slate-500 text-sm mb-4">{chapter.description}</p>
            <div className="flex items-center gap-4 text-xs text-slate-400 mb-3">
              <span>{chapter.topics.length} topics</span>
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-500" />
                {totalXp} XP total
              </span>
              <span>{completedCount}/{chapter.topics.length} completed</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Topic list */}
          <div className="space-y-2">
            {chapter.topics.map((topic) => {
              const topicProgress = progressMap[`${courseId}__${topic.id}`]
              const isCompleted = topicProgress?.status === 'completed'
              const unlocked = isTopicUnlocked(courseId, topic.id)
              const isQuiz = topic.assessmentType === 'quiz'

              return (
                <div key={topic.id}>
                  {unlocked ? (
                    <Link
                      href={`/learn/${courseId}/${chapter.id}/${topic.id}`}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all group ${
                        isCompleted
                          ? 'bg-emerald-50 border-emerald-200 hover:border-emerald-300 hover:shadow-sm'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {isCompleted
                          ? <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                          : <Circle className="w-5 h-5 text-slate-300 shrink-0" />
                        }
                        <div>
                          <h3 className="font-semibold text-slate-900 text-sm">{topic.id}: {topic.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              isQuiz
                                ? 'bg-blue-50 text-blue-600 border border-blue-200'
                                : 'bg-purple-50 text-purple-600 border border-purple-200'
                            }`}>
                              {isQuiz ? 'Quiz' : topic.assessmentType === 'mini-project' ? 'Mini-Project' : 'Coding Task'}
                            </span>
                            <span className="text-xs text-slate-400 flex items-center gap-0.5">
                              <Zap className="w-3 h-3 text-amber-400" />
                              {topic.xp} XP
                            </span>
                            {isCompleted && topicProgress.score > 0 && (
                              <span className="text-xs text-emerald-600 font-medium">Score: {topicProgress.score}%</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-600 transition-colors shrink-0" />
                    </Link>
                  ) : (
                    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50 cursor-not-allowed">
                      <div className="flex items-center gap-3">
                        <Lock className="w-5 h-5 text-slate-300 shrink-0" />
                        <div>
                          <h3 className="font-medium text-slate-400 text-sm">{topic.id}: {topic.title}</h3>
                          <p className="text-xs text-slate-300 mt-0.5">Complete previous topic to unlock</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Chapter nav */}
          <div className="flex justify-between mt-8 pt-6 border-t border-slate-200">
            {chapterNum > 1 ? (
              <Link
                href={`/learn/${courseId}/${chapterNum - 1}`}
                className="text-sm text-slate-400 hover:text-slate-700 transition-colors"
              >
                &larr; Chapter {chapterNum - 1}
              </Link>
            ) : <div />}
            {chapterNum < course.chapters.length ? (
              <Link
                href={`/learn/${courseId}/${chapterNum + 1}`}
                className="text-sm text-slate-400 hover:text-slate-700 transition-colors"
              >
                Chapter {chapterNum + 1} &rarr;
              </Link>
            ) : <div />}
          </div>
        </div>
      </main>
    </>
  )
}
