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
    <aside className="w-72 bg-gray-900 border-r border-gray-800 overflow-y-auto hidden lg:block shrink-0">
      <nav className="p-4 space-y-6">
        {/* Course label */}
        <div className="px-2">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-1">Course</p>
          <p className="text-sm font-bold text-white truncate">{course.title}</p>
        </div>

        {/* Chapters */}
        {course.chapters.map((chapter) => {
          const isCurrentChapter = pathname.includes(`/learn/${courseId}/${chapter.id}`)
          return (
            <div key={chapter.id}>
              <Link
                href={`/learn/${courseId}/${chapter.id}`}
                className={`flex items-center gap-2 text-sm font-semibold mb-2 transition-colors ${
                  isCurrentChapter ? 'text-emerald-400' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <span>{chapter.icon}</span>
                <span className="truncate">Ch.{chapter.id}: {chapter.title}</span>
              </Link>
              <ul className="space-y-1 ml-6">
                {chapter.topics.map((topic) => {
                  const topicProgress = progressMap[`${courseId}__${topic.id}`]
                  const isCompleted = topicProgress?.status === 'completed'
                  const unlocked = isTopicUnlocked(courseId, topic.id)
                  const isActive = pathname === `/learn/${courseId}/${chapter.id}/${topic.id}`

                  return (
                    <li key={topic.id}>
                      {unlocked ? (
                        <Link
                          href={`/learn/${courseId}/${chapter.id}/${topic.id}`}
                          className={`flex items-center gap-2 text-xs py-1.5 px-2 rounded transition-colors ${
                            isActive
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : isCompleted
                              ? 'text-gray-400 hover:text-gray-200'
                              : 'text-gray-500 hover:text-gray-300'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          ) : (
                            <Circle className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                          )}
                          <span className="truncate">{topic.id} {topic.title}</span>
                        </Link>
                      ) : (
                        <div className="flex items-center gap-2 text-xs py-1.5 px-2 text-gray-600 cursor-not-allowed">
                          <Lock className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{topic.id} {topic.title}</span>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}

        {/* Project */}
        <div>
          <Link
            href={`/learn/${courseId}/project`}
            className={`flex items-center gap-2 text-sm font-semibold mb-2 transition-colors ${
              pathname.startsWith(`/learn/${courseId}/project`) ? 'text-amber-400' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            <span className="truncate">Capstone Project</span>
          </Link>
          <ul className="space-y-1 ml-6">
            {course.project.milestones.map((milestone) => {
              const mProgress = milestoneMap[`${courseId}__${milestone.id}`]
              const isCompleted = mProgress?.status === 'completed'
              const unlocked = isMilestoneUnlocked(courseId, milestone.id)
              const isActive = pathname === `/learn/${courseId}/project/${milestone.id}`

              return (
                <li key={milestone.id}>
                  {unlocked ? (
                    <Link
                      href={`/learn/${courseId}/project/${milestone.id}`}
                      className={`flex items-center gap-2 text-xs py-1.5 px-2 rounded transition-colors ${
                        isActive
                          ? 'bg-amber-500/10 text-amber-400'
                          : isCompleted
                          ? 'text-gray-400 hover:text-gray-200'
                          : 'text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      ) : (
                        <Layers className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                      )}
                      <span className="truncate">{milestone.title}</span>
                    </Link>
                  ) : (
                    <div className="flex items-center gap-2 text-xs py-1.5 px-2 text-gray-600 cursor-not-allowed">
                      <Lock className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{milestone.title}</span>
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
