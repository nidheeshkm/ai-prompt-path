'use client'

import { useParams, useRouter } from 'next/navigation'
import { getCourse } from '@/data/curriculum'
import { useAuth } from '@/lib/auth-context'
import { useProgress } from '@/lib/progress-context'
import { useEnrollment } from '@/lib/enrollment-context'
import Sidebar from '@/components/Sidebar'
import Link from 'next/link'
import { CheckCircle, Lock, Layers, ChevronRight, Zap, ArrowLeft, Award } from 'lucide-react'
import { useEffect } from 'react'

export default function ProjectPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const { user, loading: authLoading } = useAuth()
  const { milestoneMap, isMilestoneUnlocked } = useProgress()
  const { isEnrolled } = useEnrollment()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth/login')
  }, [user, authLoading, router])

  const course = getCourse(courseId)

  if (authLoading || !user) return (
    <main className="flex-1 flex items-center justify-center">
      <div className="animate-pulse text-gray-500">Loading…</div>
    </main>
  )

  if (!course) return (
    <main className="flex-1 flex items-center justify-center">
      <p className="text-gray-500">Course not found.</p>
    </main>
  )

  if (!isEnrolled(courseId)) {
    router.replace(`/courses/${courseId}`)
    return null
  }

  const project = course.project
  const completedCount = project.milestones.filter(m => milestoneMap[`${courseId}__${m.id}`]?.status === 'completed').length
  const totalXP = project.milestones.reduce((s, m) => s + m.xp, 0)
  const allDone = completedCount === project.milestones.length

  return (
    <>
      <Sidebar courseId={courseId} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <Link href={`/learn/${courseId}`} className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200 mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to Course
          </Link>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <Layers className="w-8 h-8 text-amber-400" />
              <div>
                <p className="text-xs text-amber-400 font-medium uppercase tracking-wider">Capstone Project</p>
                <h1 className="text-2xl font-bold text-white">{project.title}</h1>
              </div>
            </div>
            <p className="text-gray-400 leading-relaxed">{project.description}</p>
            <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
              <span>{project.milestones.length} milestones</span>
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-yellow-500" />
                {totalXP} XP total
              </span>
              <span>{completedCount}/{project.milestones.length} completed</span>
            </div>
            <div className="w-full h-2 bg-gray-800 rounded-full mt-3 overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all"
                style={{ width: `${(completedCount / project.milestones.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Certificate banner */}
          {allDone && (
            <div className="mb-6 bg-amber-900/20 border border-amber-700/40 rounded-xl p-5 flex items-center gap-4">
              <Award className="w-8 h-8 text-amber-400 shrink-0" />
              <div>
                <h3 className="font-bold text-white">Project Complete!</h3>
                <p className="text-sm text-gray-400">You've finished all milestones. Check your dashboard for your certificate.</p>
              </div>
            </div>
          )}

          {/* Milestones */}
          <div className="space-y-3">
            {project.milestones.map((milestone, idx) => {
              const mProgress = milestoneMap[`${courseId}__${milestone.id}`]
              const isCompleted = mProgress?.status === 'completed'
              const unlocked = isMilestoneUnlocked(courseId, milestone.id)

              return unlocked ? (
                <Link
                  key={milestone.id}
                  href={`/learn/${courseId}/project/${milestone.id}`}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-colors group ${
                    isCompleted
                      ? 'bg-amber-900/10 border-amber-800/30 hover:border-amber-700/50'
                      : 'bg-gray-900 border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5 text-amber-500 shrink-0" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-600 flex items-center justify-center shrink-0">
                        <span className="text-xs text-gray-500 font-bold">{idx + 1}</span>
                      </div>
                    )}
                    <div>
                      <h3 className="font-medium text-white text-sm">{milestone.title}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs bg-purple-900/30 text-purple-400 px-2 py-0.5 rounded-full">Coding Task</span>
                        <span className="flex items-center gap-1 text-xs text-yellow-500">
                          <Zap className="w-3 h-3" />
                          {milestone.xp} XP
                        </span>
                        {isCompleted && mProgress.score > 0 && (
                          <span className="text-xs text-amber-400">Score: {mProgress.score}%</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-gray-400 transition-colors" />
                </Link>
              ) : (
                <div key={milestone.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-800/50 bg-gray-900/50 opacity-50 cursor-not-allowed">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-gray-600 shrink-0" />
                    <div>
                      <h3 className="font-medium text-gray-500 text-sm">{milestone.title}</h3>
                      <p className="text-xs text-gray-600 mt-1">Complete previous milestone to unlock</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </main>
    </>
  )
}
