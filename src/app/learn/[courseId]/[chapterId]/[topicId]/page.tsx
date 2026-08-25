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
import { ChevronLeft, ChevronRight, CheckCircle, Lock, Zap, Columns2, LayoutList, BookOpen, Code2, Trophy } from 'lucide-react'
import type { Submission, QuizSubmission, CodingSubmission } from '@/lib/supabase'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function TopicPage() {
  const { courseId, chapterId, topicId } = useParams<{ courseId: string; chapterId: string; topicId: string }>()
  const { user, profile, loading: authLoading } = useAuth()
  const { progressMap, isTopicUnlocked, completeTopic, getTopicProgress } = useProgress()
  const { isEnrolled, loading: enrollLoading } = useEnrollment()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'lesson' | 'assessment'>('lesson')
  const [splitView, setSplitView] = useState(false)
  const [markedRead, setMarkedRead] = useState(false)

  const switchTab = (tab: 'lesson' | 'assessment') => {
    setActiveTab(tab)
    setSplitView(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

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

  if (authLoading || enrollLoading || !user) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="animate-pulse text-slate-400 text-sm">Loading…</div>
    </div>
  )

  if (!course || !chapter || !topic) return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-slate-400">Topic not found.</p>
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
          <div className="text-center p-8 max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-5">
              <Lock className="w-7 h-7 text-slate-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Topic Locked</h2>
            <p className="text-sm text-slate-500 mb-5">Complete the previous topic to unlock this one.</p>
            {prevTopic && (
              <Link
                href={`/learn/${courseId}/${prevTopic.chapterId}/${prevTopic.id}`}
                className="inline-flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
              >
                Go to previous topic <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </main>
      </>
    )
  }

  const handleComplete = async (score: number, submission?: Submission) => {
    await completeTopic(courseId, topicId, score, submission)
  }

  const isQuiz = topic.assessmentType === 'quiz'

  return (
    <>
      <Sidebar courseId={courseId} />
      <main className="flex-1 overflow-y-auto bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-6">

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-6 flex-wrap">
            <Link href="/dashboard" className="hover:text-slate-700 transition-colors">Dashboard</Link>
            <span>/</span>
            <Link href={`/learn/${courseId}`} className="hover:text-slate-700 transition-colors">{course.title}</Link>
            <span>/</span>
            <Link href={`/learn/${courseId}/${chapter.id}`} className="hover:text-slate-700 transition-colors">
              Ch.{chapter.id}: {chapter.title}
            </Link>
            <span>/</span>
            <span className="text-slate-600">{topic.id}</span>
          </div>

          {/* Topic header card */}
          <div className="glass rounded-2xl p-5 mb-6">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-semibold ${
                    isQuiz
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-purple-50 border-purple-200 text-purple-700'
                  }`}>
                    {isQuiz ? <BookOpen className="w-3 h-3" /> : <Code2 className="w-3 h-3" />}
                    {isQuiz ? 'Quiz' : topic.assessmentType === 'mini-project' ? 'Mini-Project' : 'Coding Task'}
                  </span>

                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border bg-amber-50 border-amber-200 text-amber-700 font-semibold">
                    <Zap className="w-3 h-3" />
                    {topic.xp} XP
                  </span>

                  {isCompleted && (
                    <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold">
                      <CheckCircle className="w-3 h-3" />
                      Completed{topicProgress.score > 0 && ` · ${topicProgress.score}%`}
                    </span>
                  )}
                </div>

                <h1 className="text-xl font-bold text-slate-900 leading-snug">
                  {topic.id}: {topic.title}
                </h1>
              </div>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 mb-6 border border-slate-200">
            {(['lesson', 'assessment'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => switchTab(tab)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-md shadow-emerald-500/20'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab === 'lesson' ? (
                  <><BookOpen className="w-4 h-4" /> Lesson</>
                ) : isQuiz ? (
                  <><Trophy className="w-4 h-4" /> Quiz</>
                ) : (
                  <><Code2 className="w-4 h-4" /> Coding</>
                )}
              </button>
            ))}

            {topic.codingTask && (
              <button
                onClick={() => setSplitView(v => !v)}
                title={splitView ? 'Single column' : 'Split view'}
                className={`hidden xl:flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition-all ${
                  splitView
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-white'
                }`}
              >
                {splitView ? <LayoutList className="w-3.5 h-3.5" /> : <Columns2 className="w-3.5 h-3.5" />}
                {splitView ? 'Single' : 'Split'}
              </button>
            )}
          </div>

          {/* Split view */}
          {splitView && topic.codingTask ? (
            <div className="mb-8 grid grid-cols-2 gap-6 items-start">
              <div className="overflow-y-auto max-h-[75vh] pr-2">
                <LessonContent content={topic.content} />
              </div>
              <div>
                <CodeEditor
                  task={topic.codingTask}
                  topicId={topic.id}
                  topicTitle={topic.title}
                  isCompleted={isCompleted}
                  bestScore={topicProgress?.score ?? 0}
                  storedSubmission={topicProgress?.submission?.type === 'coding' ? topicProgress.submission as CodingSubmission : null}
                  onComplete={handleComplete}
                  hasKey={profile?.has_api_key}
                />
              </div>
            </div>

          ) : activeTab === 'lesson' ? (
            <div className="mb-8">
              <LessonContent content={topic.content} />

              {/* CTA bar */}
              <div className="mt-10 glass rounded-2xl p-6 flex flex-col items-center gap-4 text-center">
                {!markedRead ? (
                  <button
                    onClick={() => setMarkedRead(true)}
                    className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 px-4 py-2 rounded-xl transition-all"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Mark lesson as read
                  </button>
                ) : (
                  <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                    <CheckCircle className="w-4 h-4" /> Lesson read
                  </span>
                )}
                <button
                  onClick={() => switchTab('assessment')}
                  className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-md shadow-emerald-500/20"
                >
                  {isCompleted ? 'Retake Assessment' : 'Take Assessment'}
                  <ChevronRight className="w-4 h-4" />
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
                  bestScore={topicProgress?.score ?? 0}
                  storedSubmission={topicProgress?.submission?.type === 'quiz' ? topicProgress.submission as QuizSubmission : null}
                  onComplete={handleComplete}
                  hasKey={profile?.has_api_key}
                />
              ) : topic.codingTask ? (
                <CodeEditor
                  task={topic.codingTask}
                  topicId={topic.id}
                  topicTitle={topic.title}
                  isCompleted={isCompleted}
                  bestScore={topicProgress?.score ?? 0}
                  storedSubmission={topicProgress?.submission?.type === 'coding' ? topicProgress.submission as CodingSubmission : null}
                  onComplete={handleComplete}
                  hasKey={profile?.has_api_key}
                />
              ) : (
                <div className="glass rounded-2xl p-10 text-center">
                  <p className="text-slate-400 text-sm">Assessment not available yet.</p>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between items-center pt-6 border-t border-slate-200">
            {prevTopic ? (
              <Link
                href={`/learn/${courseId}/${prevTopic.chapterId}/${prevTopic.id}`}
                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-800 transition-colors group"
              >
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                <span className="hidden sm:inline">{prevTopic.id}: {prevTopic.title}</span>
                <span className="sm:hidden">Previous</span>
              </Link>
            ) : <div />}

            {nextTopic && isCompleted ? (
              <Link
                href={`/learn/${courseId}/${nextTopic.chapterId}/${nextTopic.id}`}
                className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors group"
              >
                <span className="hidden sm:inline">{nextTopic.id}: {nextTopic.title}</span>
                <span className="sm:hidden">Next</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ) : nextTopic && !isCompleted ? (
              <span className="flex items-center gap-1.5 text-xs text-slate-400">
                <Lock className="w-3 h-3" /> Complete to unlock next
              </span>
            ) : isCompleted ? (
              <Link
                href={`/learn/${courseId}/project`}
                className="flex items-center gap-1.5 text-sm font-semibold text-amber-600 hover:text-amber-700 transition-colors group"
              >
                Capstone Project
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ) : <div />}
          </div>
        </div>
      </main>
    </>
  )
}
