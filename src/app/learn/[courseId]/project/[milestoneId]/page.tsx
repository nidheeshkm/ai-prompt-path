'use client'

import { useParams, useRouter } from 'next/navigation'
import { getCourse } from '@/data/curriculum'
import { useAuth } from '@/lib/auth-context'
import { useProgress } from '@/lib/progress-context'
import { useEnrollment } from '@/lib/enrollment-context'
import Sidebar from '@/components/Sidebar'
import LessonContent from '@/components/LessonContent'
import CodeEditor from '@/components/CodeEditor'
import Link from 'next/link'
import { CheckCircle, Lock, ChevronLeft, ChevronRight, Zap, Layers } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { CodingTask } from '@/data/curriculum'

export default function MilestonePage() {
  const { courseId, milestoneId } = useParams<{ courseId: string; milestoneId: string }>()
  const { user, loading: authLoading } = useAuth()
  const { milestoneMap, isMilestoneUnlocked, completeMilestone, getMilestoneProgress } = useProgress()
  const { isEnrolled, loading: enrollLoading } = useEnrollment()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'overview' | 'task'>('overview')

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth/login')
  }, [user, authLoading, router])

  const course = getCourse(courseId)
  const milestone = course?.project.milestones.find(m => m.id === milestoneId)
  const milestoneIndex = course?.project.milestones.findIndex(m => m.id === milestoneId) ?? -1
  const prevMilestone = milestoneIndex > 0 ? course?.project.milestones[milestoneIndex - 1] : null
  const nextMilestone = milestoneIndex >= 0 && milestoneIndex < (course?.project.milestones.length ?? 0) - 1
    ? course?.project.milestones[milestoneIndex + 1]
    : null

  const mProgress = getMilestoneProgress(courseId, milestoneId)
  const isCompleted = mProgress?.status === 'completed'
  const unlocked = isMilestoneUnlocked(courseId, milestoneId)

  if (authLoading || enrollLoading || !user) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="animate-pulse text-gray-500">Loading…</div>
    </div>
  )

  if (!course || !milestone) return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-gray-500">Milestone not found.</p>
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
            <h2 className="text-xl font-bold text-white mb-2">Milestone Locked</h2>
            <p className="text-gray-400 mb-4">Complete the previous milestone to unlock this one.</p>
            {prevMilestone && (
              <Link
                href={`/learn/${courseId}/project/${prevMilestone.id}`}
                className="text-amber-400 hover:text-amber-300 text-sm font-medium"
              >
                Go to previous milestone &rarr;
              </Link>
            )}
          </div>
        </main>
      </>
    )
  }

  const codingTask: CodingTask = {
    instructions: milestone.instructions,
    boilerplate: milestone.boilerplate,
    rubric: milestone.rubric,
    hints: milestone.hints,
    solutionCode: milestone.solutionCode,
  }

  const handleComplete = async (score: number) => {
    await completeMilestone(courseId, milestoneId, score)
  }

  return (
    <>
      <Sidebar courseId={courseId} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
            <Link href={`/learn/${courseId}`} className="hover:text-gray-300">{course.title}</Link>
            <span>/</span>
            <Link href={`/learn/${courseId}/project`} className="hover:text-gray-300">Capstone Project</Link>
            <span>/</span>
            <span className="text-gray-300">{milestone.title}</span>
          </div>

          {/* Title */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <Layers className="w-5 h-5 text-amber-400" />
              <p className="text-xs text-amber-400 font-medium uppercase tracking-wider">
                Milestone {milestoneIndex + 1} of {course.project.milestones.length}
              </p>
            </div>
            <div className="flex items-center gap-3 mb-1">
              {isCompleted && <CheckCircle className="w-5 h-5 text-amber-500" />}
              <h1 className="text-2xl font-bold text-white">{milestone.title}</h1>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-purple-900/30 text-purple-400 border border-purple-800/30">
                Coding Challenge
              </span>
              <span className="flex items-center gap-1 text-xs text-yellow-500">
                <Zap className="w-3.5 h-3.5" />
                {milestone.xp} XP
              </span>
              {isCompleted && mProgress.score > 0 && (
                <span className="text-xs text-amber-400">Best: {mProgress.score}%</span>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-800 mb-6">
            {(['overview', 'task'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                {tab === 'overview' ? 'Overview' : 'Coding Challenge'}
              </button>
            ))}
          </div>

          {activeTab === 'overview' ? (
            <div className="mb-8">
              <LessonContent content={`# ${milestone.title}\n\n${milestone.instructions}`} />
              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => setActiveTab('task')}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
                >
                  {isCompleted ? 'Retake Challenge' : 'Start Challenge'} &rarr;
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-8">
              <CodeEditor
                task={codingTask}
                topicId={`${courseId}__${milestoneId}`}
                topicTitle={milestone.title}
                isCompleted={isCompleted}
                onComplete={handleComplete}
              />
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-6 border-t border-gray-800">
            {prevMilestone ? (
              <Link
                href={`/learn/${courseId}/project/${prevMilestone.id}`}
                className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200"
              >
                <ChevronLeft className="w-4 h-4" />
                {prevMilestone.title}
              </Link>
            ) : (
              <Link href={`/learn/${courseId}/project`} className="text-sm text-gray-400 hover:text-gray-200">
                &larr; Project Overview
              </Link>
            )}
            {nextMilestone && isCompleted ? (
              <Link
                href={`/learn/${courseId}/project/${nextMilestone.id}`}
                className="flex items-center gap-1 text-sm text-amber-400 hover:text-amber-300"
              >
                {nextMilestone.title}
                <ChevronRight className="w-4 h-4" />
              </Link>
            ) : nextMilestone && !isCompleted ? (
              <span className="text-sm text-gray-600">Complete to unlock next &rarr;</span>
            ) : isCompleted ? (
              <Link href={`/learn/${courseId}/project`} className="text-sm text-amber-400 hover:text-amber-300">
                Project Complete! &rarr;
              </Link>
            ) : <div />}
          </div>
        </div>
      </main>
    </>
  )
}
