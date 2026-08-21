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
    <aside className="w-72 shrink-0 hidden lg:flex flex-col border-r border-white/[0.07] bg-[#0b0f1a] overflow-y-auto">
      <nav className="p-4 space-y-5">

        {/* Course label */}
        <div className="px-2 pb-2 border-b border-white/[0.06]">
          <p className="text-[10px] text-white/30 uppercase tracking-widest font-semibold mb-1.5">Course</p>
          <p className="text-sm font-bold text-white leading-snug">{course.title}</p>
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
                className={`flex items-start gap-2 mb-2 px-2 py-1.5 rounded-lg transition-colors group ${
                  isCurrentChapter
                    ? 'text-emerald-400'
                    : 'text-white/65 hover:text-white/90'
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
              <ul className="space-y-0.5 ml-5 border-l border-white/[0.06] pl-3">
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
                              ? 'bg-emerald-500/10 text-emerald-300 font-medium'
                              : isCompleted
                              ? 'text-white/70 hover:text-white/90'
                              : 'text-white/60 hover:text-white/90'
                          }`}
                        >
                          <span className="shrink-0 mt-0.5">
                            {isCompleted
                              ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                              : <Circle className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-white/20'}`} />
                            }
                          </span>
                          {/* Allow wrapping — do NOT truncate */}
                          <span className="break-words min-w-0">
                            <span className="text-white/30 mr-1">{topic.id}</span>
                            {topic.title}
                          </span>
                        </Link>
                      ) : (
                        <div className={`${baseRow} text-white/60 cursor-not-allowed`}>
                          <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-white/50" />
                          <span className="break-words min-w-0">
                            <span className="text-white/40 mr-1">{topic.id}</span>
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
                ? 'text-amber-400'
                : 'text-white/55 hover:text-white/90'
            }`}
          >
            <FolderOpen className="w-4 h-4 shrink-0" />
            <span>Capstone Project</span>
          </Link>

          <ul className="space-y-0.5 ml-5 border-l border-white/[0.06] pl-3">
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
                          ? 'bg-amber-500/10 text-amber-300 font-medium'
                          : isCompleted
                          ? 'text-white/70 hover:text-white/90'
                          : 'text-white/60 hover:text-white/90'
                      }`}
                    >
                      <span className="shrink-0 mt-0.5">
                        {isCompleted
                          ? <CheckCircle className="w-3.5 h-3.5 text-amber-400" />
                          : <Layers className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-white/20'}`} />
                        }
                      </span>
                      <span className="break-words min-w-0">{milestone.title}</span>
                    </Link>
                  ) : (
                    <div className={`${baseRow} text-white/60 cursor-not-allowed`}>
                      <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-white/50" />
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
