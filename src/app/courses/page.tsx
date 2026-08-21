'use client'

import { courses } from '@/data/curriculum'
import { useAuth } from '@/lib/auth-context'
import { useEnrollment } from '@/lib/enrollment-context'
import { useProgress } from '@/lib/progress-context'
import Link from 'next/link'
import { BookOpen, Clock, Trophy, ChevronRight, Award, Sparkles } from 'lucide-react'

const LEVEL_CONFIG = {
  beginner: {
    label: 'Beginner',
    badge: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    gradient: 'from-emerald-500 to-cyan-500',
    shadow: 'shadow-emerald-500/15',
  },
  intermediate: {
    label: 'Intermediate',
    badge: 'text-blue-700 bg-blue-50 border-blue-200',
    gradient: 'from-blue-500 to-violet-600',
    shadow: 'shadow-blue-500/15',
  },
  advanced: {
    label: 'Advanced',
    badge: 'text-purple-700 bg-purple-50 border-purple-200',
    gradient: 'from-violet-500 to-purple-700',
    shadow: 'shadow-violet-500/15',
  },
}

const COURSE_GRADIENTS = [
  'from-emerald-500 to-cyan-500',
  'from-violet-500 to-purple-600',
  'from-orange-500 to-amber-500',
  'from-blue-500 to-cyan-500',
  'from-rose-500 to-pink-500',
  'from-teal-500 to-emerald-600',
]

export default function CourseCatalogPage() {
  const { user } = useAuth()
  const { isEnrolled, getCertificate } = useEnrollment()
  const { progressMap } = useProgress()

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Course Catalog</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">
            Start your <span className="gradient-text">AI engineering</span> journey
          </h1>
          <p className="text-slate-500 mt-2 text-sm">Hands-on courses with AI-powered assessments and certificates.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {courses.map((course, i) => {
            const enrolled = user ? isEnrolled(course.id) : false
            const certificate = user ? getCertificate(course.id) : undefined
            const totalTopics = course.chapters.flatMap(c => c.topics).length
            const completedTopics = user
              ? course.chapters.flatMap(c => c.topics).filter(t => progressMap[`${course.id}__${t.id}`]?.status === 'completed').length
              : 0
            const completionPct = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0
            const levelConf = LEVEL_CONFIG[course.level]
            const gradient = COURSE_GRADIENTS[i % COURSE_GRADIENTS.length]

            return (
              <div
                key={course.id}
                className="glass rounded-2xl overflow-hidden flex flex-col group hover:shadow-lg transition-all duration-300"
              >
                {/* Gradient banner */}
                <div className={`relative h-28 bg-gradient-to-br ${gradient} flex items-end p-4 overflow-hidden`}>
                  <div className="absolute inset-0 opacity-20"
                    style={{ backgroundImage: 'radial-gradient(circle at 70% 30%, rgba(255,255,255,0.4) 0%, transparent 60%)' }}
                  />
                  <span className="relative text-5xl drop-shadow-lg group-hover:scale-110 transition-transform duration-300">
                    {course.icon}
                  </span>
                  {certificate && (
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-white/90 text-amber-600 text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
                      <Award className="w-3.5 h-3.5" />
                      Certified
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-4 p-5 flex-1">
                  {/* Title + level */}
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold capitalize ${levelConf.badge}`}>
                        {levelConf.label}
                      </span>
                      {enrolled && (
                        <span className="text-xs px-2.5 py-0.5 rounded-full border font-semibold text-emerald-700 bg-emerald-50 border-emerald-200">
                          Enrolled
                        </span>
                      )}
                    </div>
                    <h2 className="text-base font-bold text-slate-900 leading-snug">{course.title}</h2>
                    <p className="text-sm text-slate-500 mt-0.5">{course.tagline}</p>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{course.description}</p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {course.tags.map(tag => (
                      <span key={tag} className="text-xs px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500 border border-slate-200">
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" />
                      {course.chapters.length} chapters
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      ~{course.estimatedHours}h
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5" />
                      Certificate
                    </span>
                  </div>

                  {/* Progress bar (enrolled only) */}
                  {enrolled && (
                    <div>
                      <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                        <span>{completedTopics}/{totalTopics} topics</span>
                        <span className="font-semibold text-slate-600">{completionPct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${gradient} rounded-full transition-all duration-700`}
                          style={{ width: `${completionPct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* CTA */}
                  <div className="mt-auto pt-1">
                    {!user ? (
                      <Link
                        href="/auth/signup"
                        className={`flex items-center justify-center gap-2 w-full bg-gradient-to-r ${gradient} text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all shadow-md ${levelConf.shadow} hover:opacity-90`}
                      >
                        Sign up to enroll <ChevronRight className="w-4 h-4" />
                      </Link>
                    ) : enrolled ? (
                      <Link
                        href={`/learn/${course.id}`}
                        className={`flex items-center justify-center gap-2 w-full bg-gradient-to-r ${gradient} text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all shadow-md ${levelConf.shadow} hover:opacity-90 group`}
                      >
                        Continue Learning
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    ) : (
                      <Link
                        href={`/courses/${course.id}`}
                        className="flex items-center justify-center gap-2 w-full border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-sm font-semibold px-4 py-2.5 rounded-xl transition-all"
                      >
                        View Course Details <ChevronRight className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
