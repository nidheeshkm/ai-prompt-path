'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getCourse } from '@/data/curriculum'
import { Lock, CheckCircle, Circle, Layers, FolderOpen } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useProgress } from '@/lib/progress-context'

export default function Sidebar({ courseId }: { courseId: string }) {
  const pathname = usePathname()
  const { user } = useAuth()
  const { progressMap, milestoneMap, isTopicUnlocked, isMilestoneUnlocked } = useProgress()

  const course = getCourse(courseId)
  if (!user || !course) return null

  return (
    <aside className="w-72 shrink-0 hidden lg:flex flex-col border-r border-black/[0.07] bg-slate-50 overflow-y-auto">
      <nav className="p-4 space-y-5">

        {/* Course label */}
        <div className="px-2 pb-2 border-b border-black/[0.07]">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mb-1.5">Course</p>
          <p className="text-sm font-bold text-slate-900 leading-snug">{course.title}</p>
        </div>

        {/* Chapters */}
        {course.chapters.map((chapter) => {
          const isCurrentChapter = pathname.includes(`/learn/${courseId}/${chapter.id}`)
          const completedCount = chapter.topics.filter(
            t => progressMap[`${courseId}__${t.id}`]?.status === 'completed'
          ).length

          return (
            <div key={chapter.id}>
              {/* Chapter header */}
              <Link
                href={`/learn/${courseId}/${chapter.id}`}
                className={`flex items-start gap-2 mb-2 px-2 py-1.5 rounded-lg transition-colors ${
                  isCurrentChapter
                    ? 'text-emerald-700 bg-emerald-50'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span className="shrink-0 mt-0.5">{chapter.icon}</span>
                <span className="text-xs font-semibold leading-snug break-words min-w-0">
                  Ch.{chapter.id}: {chapter.title}
                </span>
                {completedCount > 0 && completedCount === chapter.topics.length && (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5 ml-auto" />
                )}
              </Link>

              {/* Topics */}
              <ul className="space-y-0.5 ml-5 border-l border-slate-200 pl-3">
                {chapter.topics.map((topic) => {
                  const topicProgress = progressMap[`${courseId}__${topic.id}`]
                  const isCompleted = topicProgress?.status === 'completed'
                  const unlocked = isTopicUnlocked(courseId, topic.id)
                  const isActive = pathname === `/learn/${courseId}/${chapter.id}/${topic.id}`

                  const baseRow = 'flex items-start gap-2 py-1.5 px-2 rounded-lg text-xs leading-snug transition-colors'

                  return (
                    <li key={topic.id}>
                      {unlocked ? (
                        <Link
                          href={`/learn/${courseId}/${chapter.id}/${topic.id}`}
                          className={`${baseRow} ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 font-medium'
                              : isCompleted
                              ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                        >
                          <span className="shrink-0 mt-0.5">
                            {isCompleted
                              ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                              : <Circle className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-500' : 'text-slate-300'}`} />
                            }
                          </span>
                          <span className="break-words min-w-0">
                            <span className="text-slate-400 mr-1">{topic.id}</span>
                            {topic.title}
                          </span>
                        </Link>
                      ) : (
                        <div className={`${baseRow} text-slate-400 cursor-not-allowed`}>
                          <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-300" />
                          <span className="break-words min-w-0">
                            <span className="text-slate-300 mr-1">{topic.id}</span>
                            {topic.title}
                          </span>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}

        {/* Capstone Project */}
        <div>
          <Link
            href={`/learn/${courseId}/project`}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold mb-2 transition-colors ${
              pathname.startsWith(`/learn/${courseId}/project`)
                ? 'text-amber-700 bg-amber-50'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FolderOpen className="w-4 h-4 shrink-0" />
            <span>Capstone Project</span>
          </Link>

          <ul className="space-y-0.5 ml-5 border-l border-slate-200 pl-3">
            {course.project.milestones.map((milestone) => {
              const mProgress = milestoneMap[`${courseId}__${milestone.id}`]
              const isCompleted = mProgress?.status === 'completed'
              const unlocked = isMilestoneUnlocked(courseId, milestone.id)
              const isActive = pathname === `/learn/${courseId}/project/${milestone.id}`

              const baseRow = 'flex items-start gap-2 py-1.5 px-2 rounded-lg text-xs leading-snug transition-colors'

              return (
                <li key={milestone.id}>
                  {unlocked ? (
                    <Link
                      href={`/learn/${courseId}/project/${milestone.id}`}
                      className={`${baseRow} ${
                        isActive
                          ? 'bg-amber-50 text-amber-700 font-medium'
                          : isCompleted
                          ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <span className="shrink-0 mt-0.5">
                        {isCompleted
                          ? <CheckCircle className="w-3.5 h-3.5 text-amber-500" />
                          : <Layers className={`w-3.5 h-3.5 ${isActive ? 'text-amber-500' : 'text-slate-300'}`} />
                        }
                      </span>
                      <span className="break-words min-w-0">{milestone.title}</span>
                    </Link>
                  ) : (
                    <div className={`${baseRow} text-slate-400 cursor-not-allowed`}>
                      <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-300" />
                      <span className="break-words min-w-0">{milestone.title}</span>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>

      </nav>
    </aside>
  )
}
