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
    badge: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    gradient: 'from-emerald-500 to-cyan-500',
    glow: 'shadow-emerald-500/20',
  },
  intermediate: {
    label: 'Intermediate',
    badge: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    gradient: 'from-blue-500 to-violet-600',
    glow: 'shadow-blue-500/20',
  },
  advanced: {
    label: 'Advanced',
    badge: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    gradient: 'from-violet-500 to-purple-700',
    glow: 'shadow-violet-500/20',
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
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Course Catalog</span>
          </div>
          <h1 className="text-3xl font-bold text-white">
            Start your <span className="gradient-text">AI engineering</span> journey
          </h1>
          <p className="text-white/40 mt-2 text-sm">Hands-on courses with AI-powered assessments and certificates.</p>
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
                className="glass rounded-2xl overflow-hidden flex flex-col group hover:border-white/[0.14] transition-all duration-300"
              >
                {/* Gradient banner */}
                <div className={`relative h-28 bg-gradient-to-br ${gradient} flex items-end p-4 overflow-hidden`}>
                  {/* Background pattern */}
                  <div className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage: 'radial-gradient(circle at 70% 30%, rgba(255,255,255,0.3) 0%, transparent 60%)',
                    }}
                  />
                  <span className="relative text-5xl drop-shadow-lg group-hover:scale-110 transition-transform duration-300">
                    {course.icon}
                  </span>
                  {certificate && (
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/30 backdrop-blur-sm border border-white/20 text-amber-300 text-xs font-semibold px-2.5 py-1 rounded-full">
                      <Award className="w-3.5 h-3.5" />
                      Certified
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-4 p-5 flex-1">
                  {/* Title + level */}
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold capitalize ${levelConf.badge}`}>
                        {levelConf.label}
                      </span>
                      {enrolled && (
                        <span className="text-xs px-2.5 py-0.5 rounded-full border font-semibold text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
                          Enrolled
                        </span>
                      )}
                    </div>
                    <h2 className="text-base font-bold text-white leading-snug">{course.title}</h2>
                    <p className="text-sm text-white/50 mt-0.5">{course.tagline}</p>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-white/35 line-clamp-2 leading-relaxed">{course.description}</p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {course.tags.map(tag => (
                      <span key={tag} className="text-xs px-2 py-0.5 rounded-lg bg-white/[0.05] text-white/40 border border-white/[0.06]">
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-white/30">
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
                      <div className="flex justify-between text-xs text-white/30 mb-1.5">
                        <span>{completedTopics}/{totalTopics} topics</span>
                        <span className="font-semibold text-white/50">{completionPct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
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
                        className={`flex items-center justify-center gap-2 w-full bg-gradient-to-r ${gradient} text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all shadow-lg ${levelConf.glow} hover:opacity-90`}
                      >
                        Sign up to enroll
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    ) : enrolled ? (
                      <Link
                        href={`/learn/${course.id}`}
                        className={`flex items-center justify-center gap-2 w-full bg-gradient-to-r ${gradient} text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all shadow-lg ${levelConf.glow} hover:opacity-90 group`}
                      >
                        Continue Learning
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    ) : (
                      <Link
                        href={`/courses/${course.id}`}
                        className={`flex items-center justify-center gap-2 w-full border border-white/10 hover:border-white/20 text-white/70 hover:text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all`}
                      >
                        View Course Details
                        <ChevronRight className="w-4 h-4" />
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
