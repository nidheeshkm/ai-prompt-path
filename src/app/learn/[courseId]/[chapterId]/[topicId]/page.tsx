'use client'

import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useProgress } from '@/lib/progress-context'
import { useEnrollment } from '@/lib/enrollment-context'
import { getCourse, getCourseTopics, getCourseNextTopic, getCoursePrevTopic } from '@/data/curriculum'
import Sidebar from '@/components/Sidebar'
import LessonContent from '@/components/LessonContent'
import QuizComponent from '@/components/QuizComponent'
import CodeEditor from '@/components/CodeEditor'
import { ChevronLeft, ChevronRight, CheckCircle, Lock, Zap } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function TopicPage() {
  const { courseId, chapterId, topicId } = useParams<{ courseId: string; chapterId: string; topicId: string }>()
  const { user, loading: authLoading } = useAuth()
  const { progressMap, isTopicUnlocked, completeTopic, getTopicProgress } = useProgress()
  const { isEnrolled } = useEnrollment()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'lesson' | 'assessment'>('lesson')

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth/login')
  }, [user, authLoading, router])

  const course = getCourse(courseId)
  const chapter = course?.chapters.find(c => c.id === Number(chapterId))
  const topic = chapter?.topics.find(t => t.id === topicId)
  const topicProgress = getTopicProgress(courseId, topicId)
  const isCompleted = topicProgress?.status === 'completed'
  const unlocked = isTopicUnlocked(courseId, topicId)

  const nextTopicId = topic ? getCourseNextTopic(courseId, topicId) : null
  const prevTopicId = topic ? getCoursePrevTopic(courseId, topicId) : null
  const allTopics = getCourseTopics(courseId)
  const nextTopic = nextTopicId ? allTopics.find(t => t.id === nextTopicId) : null
  const prevTopic = prevTopicId ? allTopics.find(t => t.id === prevTopicId) : null

  if (authLoading || !user) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="animate-pulse text-gray-500">Loading…</div>
    </div>
  )

  if (!course || !chapter || !topic) return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-gray-500">Topic not found.</p>
    </div>
  )

  if (!isEnrolled(courseId)) {
    router.replace(`/courses/${courseId}`)
    return null
  }

  if (!unlocked) {
    return (
      <>
        <Sidebar courseId={courseId} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center p-8">
            <Lock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Topic Locked</h2>
            <p className="text-gray-400 mb-4">Complete the previous topic to unlock this one.</p>
            {prevTopic && (
              <Link
                href={`/learn/${courseId}/${prevTopic.chapterId}/${prevTopic.id}`}
                className="text-emerald-400 hover:text-emerald-300 text-sm font-medium"
              >
                Go to previous topic &rarr;
              </Link>
            )}
          </div>
        </main>
      </>
    )
  }

  const handleComplete = async (score: number) => {
    await completeTopic(courseId, topicId, score)
  }

  return (
    <>
      <Sidebar courseId={courseId} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
            <Link href="/dashboard" className="hover:text-gray-300">Dashboard</Link>
            <span>/</span>
            <Link href={`/learn/${courseId}`} className="hover:text-gray-300">{course.title}</Link>
            <span>/</span>
            <Link href={`/learn/${courseId}/${chapter.id}`} className="hover:text-gray-300">Ch.{chapter.id}</Link>
            <span>/</span>
            <span className="text-gray-300">{topic.id}</span>
          </div>

          {/* Title */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-1">
              {isCompleted && <CheckCircle className="w-5 h-5 text-emerald-500" />}
              <h1 className="text-2xl font-bold text-white">{topic.id}: {topic.title}</h1>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                topic.assessmentType === 'quiz'
                  ? 'bg-blue-900/30 text-blue-400 border border-blue-800/30'
                  : 'bg-purple-900/30 text-purple-400 border border-purple-800/30'
              }`}>
                {topic.assessmentType === 'quiz' ? 'Quiz' : 'Coding Task'}
              </span>
              <span className="flex items-center gap-1 text-xs text-yellow-500">
                <Zap className="w-3.5 h-3.5" />
                {topic.xp} XP
              </span>
              {isCompleted && topicProgress.score > 0 && (
                <span className="text-xs text-emerald-400">Best: {topicProgress.score}%</span>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-800 mb-6">
            {(['lesson', 'assessment'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                {tab === 'lesson' ? 'Lesson' : topic.assessmentType === 'quiz' ? 'Quiz' : 'Coding Challenge'}
              </button>
            ))}
          </div>

          {/* Content */}
          {activeTab === 'lesson' ? (
            <div className="mb-8">
              <LessonContent content={topic.content} />
              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => setActiveTab('assessment')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
                >
                  {isCompleted ? 'Retake Assessment' : 'Take Assessment'} &rarr;
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-8">
              {topic.assessmentType === 'quiz' && topic.quiz ? (
                <QuizComponent
                  questions={topic.quiz}
                  topicId={topic.id}
                  isCompleted={isCompleted}
                  onComplete={handleComplete}
                />
              ) : topic.codingTask ? (
                <CodeEditor
                  task={topic.codingTask}
                  topicId={topic.id}
                  topicTitle={topic.title}
                  isCompleted={isCompleted}
                  onComplete={handleComplete}
                />
              ) : (
                <p className="text-gray-500">Assessment not available yet.</p>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-6 border-t border-gray-800">
            {prevTopic ? (
              <Link
                href={`/learn/${courseId}/${prevTopic.chapterId}/${prevTopic.id}`}
                className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200"
              >
                <ChevronLeft className="w-4 h-4" />
                {prevTopic.id}: {prevTopic.title}
              </Link>
            ) : <div />}
            {nextTopic && isCompleted ? (
              <Link
                href={`/learn/${courseId}/${nextTopic.chapterId}/${nextTopic.id}`}
                className="flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300"
              >
                {nextTopic.id}: {nextTopic.title}
                <ChevronRight className="w-4 h-4" />
              </Link>
            ) : nextTopic && !isCompleted ? (
              <span className="flex items-center gap-1 text-sm text-gray-600">
                Complete to unlock next &rarr;
              </span>
            ) : isCompleted ? (
              <Link
                href={`/learn/${courseId}/project`}
                className="flex items-center gap-1 text-sm text-amber-400 hover:text-amber-300"
              >
                Capstone Project &rarr;
              </Link>
            ) : <div />}
          </div>
        </div>
      </main>
    </>
  )
}
