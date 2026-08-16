'use client'

import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useProgress } from '@/lib/progress-context'
import { useEnrollment } from '@/lib/enrollment-context'
import { getCourse } from '@/data/curriculum'
import Link from 'next/link'
import { CheckCircle, Lock, Circle, ChevronRight, ArrowLeft } from 'lucide-react'
import { useEffect } from 'react'
import Sidebar from '@/components/Sidebar'

export default function ChapterPage() {
  const { courseId, chapterId } = useParams<{ courseId: string; chapterId: string }>()
  const { user, loading: authLoading } = useAuth()
  const { progressMap, isTopicUnlocked } = useProgress()
  const { isEnrolled } = useEnrollment()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth/login')
  }, [user, authLoading, router])

  const course = getCourse(courseId)
  const chapter = course?.chapters.find(c => c.id === Number(chapterId))

  if (authLoading || !user) return (
    <main className="flex-1 flex items-center justify-center">
      <div className="animate-pulse text-gray-500">Loading…</div>
    </main>
  )

  if (!course || !chapter) return (
    <main className="flex-1 flex items-center justify-center">
      <p className="text-gray-500">Chapter not found.</p>
    </main>
  )

  if (!isEnrolled(courseId)) {
    router.replace(`/courses/${courseId}`)
    return null
  }

  const completedCount = chapter.topics.filter(t => progressMap[`${courseId}__${t.id}`]?.status === 'completed').length
  const totalXp = chapter.topics.reduce((sum, t) => sum + t.xp, 0)
  const chapterNum = Number(chapterId)

  return (
    <>
      <Sidebar courseId={courseId} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <Link href={`/learn/${courseId}`} className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200 mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to Course
          </Link>

          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">{chapter.icon}</span>
              <div>
                <p className="text-sm text-emerald-400 font-medium">{chapter.part}</p>
                <h1 className="text-2xl font-bold text-white">Chapter {chapter.id}: {chapter.title}</h1>
              </div>
            </div>
            <p className="text-gray-400 mt-2">{chapter.description}</p>
            <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
              <span>{chapter.topics.length} topics</span>
              <span>{totalXp} XP total</span>
              <span>{completedCount}/{chapter.topics.length} completed</span>
            </div>
            <div className="w-full h-2 bg-gray-800 rounded-full mt-3 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${(completedCount / chapter.topics.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="space-y-3">
            {chapter.topics.map((topic) => {
              const topicProgress = progressMap[`${courseId}__${topic.id}`]
              const isCompleted = topicProgress?.status === 'completed'
              const unlocked = isTopicUnlocked(courseId, topic.id)

              return (
                <div key={topic.id}>
                  {unlocked ? (
                    <Link
                      href={`/learn/${courseId}/${chapter.id}/${topic.id}`}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-colors group ${
                        isCompleted
                          ? 'bg-emerald-900/10 border-emerald-800/30 hover:border-emerald-700/50'
                          : 'bg-gray-900 border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {isCompleted ? (
                          <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-600 shrink-0" />
                        )}
                        <div>
                          <h3 className="font-medium text-white text-sm">{topic.id}: {topic.title}</h3>
                          <div className="flex items-center gap-3 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              topic.assessmentType === 'quiz'
                                ? 'bg-blue-900/30 text-blue-400'
                                : 'bg-purple-900/30 text-purple-400'
                            }`}>
                              {topic.assessmentType === 'quiz' ? 'Quiz' : 'Coding Task'}
                            </span>
                            <span className="text-xs text-gray-500">{topic.xp} XP</span>
                            {isCompleted && topicProgress.score > 0 && (
                              <span className="text-xs text-emerald-400">Score: {topicProgress.score}%</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-gray-400 transition-colors" />
                    </Link>
                  ) : (
                    <div className="flex items-center justify-between p-4 rounded-xl border border-gray-800/50 bg-gray-900/50 opacity-50 cursor-not-allowed">
                      <div className="flex items-center gap-3">
                        <Lock className="w-5 h-5 text-gray-600 shrink-0" />
                        <div>
                          <h3 className="font-medium text-gray-500 text-sm">{topic.id}: {topic.title}</h3>
                          <p className="text-xs text-gray-600 mt-1">Complete previous topic to unlock</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="flex justify-between mt-8 pt-6 border-t border-gray-800">
            {chapterNum > 1 && (
              <Link href={`/learn/${courseId}/${chapterNum - 1}`} className="text-sm text-gray-400 hover:text-gray-200">
                &larr; Chapter {chapterNum - 1}
              </Link>
            )}
            <div />
            {chapterNum < course.chapters.length && (
              <Link href={`/learn/${courseId}/${chapterNum + 1}`} className="text-sm text-gray-400 hover:text-gray-200">
                Chapter {chapterNum + 1} &rarr;
              </Link>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
