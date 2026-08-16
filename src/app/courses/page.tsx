'use client'

import { courses } from '@/data/curriculum'
import { useAuth } from '@/lib/auth-context'
import { useEnrollment } from '@/lib/enrollment-context'
import { useProgress } from '@/lib/progress-context'
import Link from 'next/link'
import { BookOpen, Clock, Trophy, CheckCircle, ChevronRight, Award } from 'lucide-react'

const LEVEL_COLORS = {
  beginner: 'text-emerald-400 bg-emerald-400/10 border-emerald-800/30',
  intermediate: 'text-blue-400 bg-blue-400/10 border-blue-800/30',
  advanced: 'text-purple-400 bg-purple-400/10 border-purple-800/30',
}

export default function CourseCatalogPage() {
  const { user } = useAuth()
  const { isEnrolled, getCertificate } = useEnrollment()
  const { progressMap } = useProgress()

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Course Catalog</h1>
          <p className="text-gray-400 mt-2">Choose a course to start your AI engineering journey.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {courses.map((course) => {
            const enrolled = user ? isEnrolled(course.id) : false
            const certificate = user ? getCertificate(course.id) : undefined
            const totalTopics = course.chapters.flatMap(c => c.topics).length
            const completedTopics = user
              ? course.chapters.flatMap(c => c.topics).filter(t => progressMap[`${course.id}__${t.id}`]?.status === 'completed').length
              : 0
            const completionPct = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0

            return (
              <div
                key={course.id}
                className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-4 hover:border-gray-700 transition-colors"
              >
                {/* Header */}
                <div className="flex items-start gap-4">
                  <span className="text-4xl">{course.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${LEVEL_COLORS[course.level]}`}>
                        {course.level}
                      </span>
                      {certificate && (
                        <span className="text-xs px-2 py-0.5 rounded-full border text-amber-400 bg-amber-400/10 border-amber-800/30 flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          Certified
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg font-bold text-white">{course.title}</h2>
                    <p className="text-sm text-gray-400 mt-0.5">{course.tagline}</p>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-500 line-clamp-3">{course.description}</p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {course.tags.map(tag => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400">{tag}</span>
                  ))}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4" />
                    {course.chapters.length} chapters
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    ~{course.estimatedHours}h
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Trophy className="w-4 h-4" />
                    Certificate
                  </span>
                </div>

                {/* Progress (if enrolled) */}
                {enrolled && (
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                      <span>{completedTopics}/{totalTopics} topics</span>
                      <span>{completionPct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${completionPct}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* CTA */}
                <div className="mt-auto">
                  {!user ? (
                    <Link
                      href="/auth/signup"
                      className="flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
                    >
                      Sign up to enroll
                    </Link>
                  ) : enrolled ? (
                    <Link
                      href={`/learn/${course.id}`}
                      className="flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors group"
                    >
                      Continue Learning
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  ) : (
                    <Link
                      href={`/courses/${course.id}`}
                      className="flex items-center justify-center gap-2 w-full border border-emerald-600 text-emerald-400 hover:bg-emerald-600 hover:text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
                    >
                      View Course
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
