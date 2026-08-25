'use client'

import { useParams, useRouter } from 'next/navigation'
import { getCourse, getCourseTotalXP } from '@/data/curriculum'
import { useAuth } from '@/lib/auth-context'
import { useEnrollment } from '@/lib/enrollment-context'
import Link from 'next/link'
import { BookOpen, ChevronRight, ArrowLeft, Award, Layers, Key, AlertTriangle, Lock, ChevronDown, Zap } from 'lucide-react'
import { useState } from 'react'

const ASSESSMENT_LABELS: Record<string, { label: string; color: string }> = {
  quiz:         { label: 'Quiz',        color: 'text-blue-600 bg-blue-50 border-blue-200' },
  coding:       { label: 'Coding',      color: 'text-purple-600 bg-purple-50 border-purple-200' },
  'mini-project': { label: 'Project',  color: 'text-amber-600 bg-amber-50 border-amber-200' },
}

export default function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const { user, profile } = useAuth()
  const { isEnrolled, enroll } = useEnrollment()
  const router = useRouter()
  const [enrolling, setEnrolling] = useState(false)
  const [showKeyGate, setShowKeyGate] = useState(false)

  const course = getCourse(courseId)

  // Start with the first chapter expanded
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(
    () => new Set(course ? [course.chapters[0]?.id] : [])
  )

  if (!course) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-slate-400">Course not found.</p>
      </main>
    )
  }

  const enrolled = user ? isEnrolled(courseId) : false
  const totalTopics = course.chapters.flatMap(c => c.topics).length
  const totalXP = getCourseTotalXP(courseId)
  const hasKey = profile?.has_api_key

  const handleEnroll = async () => {
    if (!user) { router.push('/auth/signup'); return }
    if (!hasKey) { setShowKeyGate(true); return }
    setEnrolling(true)
    await enroll(courseId)
    router.push(`/learn/${courseId}`)
  }

  return (
    <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">

        <Link href="/courses" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Catalog
        </Link>

        {/* OpenRouter key gate banner */}
        {showKeyGate && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">AI provider key required to enroll</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Assessments and quizzes are AI-powered. Add a free OpenRouter or Groq key in Settings to get started.
              </p>
              <Link
                href="/settings"
                className="inline-flex items-center gap-1.5 mt-2.5 text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Key className="w-3.5 h-3.5" />
                Configure a provider key in Settings
              </Link>
            </div>
          </div>
        )}

        {/* Passive key reminder for logged-in users without a key */}
        {user && !hasKey && !showKeyGate && (
          <div className="bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <Key className="w-4 h-4 text-slate-400 shrink-0" />
            <p className="text-xs text-slate-500 flex-1">
              You&apos;ll need an AI provider key (OpenRouter and Groq are free) to take quizzes and assessments.{' '}
              <Link href="/settings" className="text-emerald-600 underline underline-offset-2">Add one in Settings →</Link>
            </p>
          </div>
        )}

        {/* Hero card */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-500 to-cyan-600 p-8">
            <div className="flex items-start gap-5">
              <span className="text-5xl drop-shadow-lg">{course.icon}</span>
              <div className="flex-1">
                <p className="text-emerald-100 text-sm font-medium capitalize mb-1">{course.level} · ~{course.estimatedHours} hours</p>
                <h1 className="text-2xl font-bold text-white mb-2 leading-snug">{course.title}</h1>
                <p className="text-emerald-50 text-sm leading-relaxed">{course.tagline}</p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {course.tags.map(tag => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white font-medium">{tag}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/20">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{course.chapters.length}</p>
                <p className="text-xs text-emerald-100 mt-0.5">Chapters</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{totalTopics}</p>
                <p className="text-xs text-emerald-100 mt-0.5">Topics</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{totalXP.toLocaleString()}</p>
                <p className="text-xs text-emerald-100 mt-0.5">XP Available</p>
              </div>
            </div>
          </div>

          {/* Enroll CTA */}
          <div className="p-5 bg-white border-t border-slate-100">
            {enrolled ? (
              <Link
                href={`/learn/${courseId}`}
                className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-md shadow-emerald-500/20 group"
              >
                Continue Learning
                <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={handleEnroll}
                  disabled={enrolling}
                  className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold px-6 py-3 rounded-xl transition-all shadow-md shadow-emerald-500/20"
                >
                  {enrolling ? 'Enrolling…' : user ? 'Enroll & Start Learning' : 'Sign up to Enroll'}
                  {!enrolling && <ChevronRight className="w-5 h-5" />}
                </button>
                {user && !hasKey && (
                  <p className="text-center text-xs text-amber-600 flex items-center justify-center gap-1">
                    <Key className="w-3 h-3" />
                    OpenRouter key required — <Link href="/settings" className="underline underline-offset-2 font-medium">add it first</Link>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* About */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-3">About this Course</h2>
          <p className="text-slate-600 leading-relaxed text-sm">{course.description}</p>
        </div>

        {/* Curriculum */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-900">Curriculum</h2>
            <span className="text-xs text-slate-400">{totalTopics} topics · {course.chapters.length} chapters</span>
          </div>
          <div className="space-y-2">
            {course.chapters.map((chapter) => {
              const isOpen = expandedChapters.has(chapter.id)
              const toggle = () => setExpandedChapters(prev => {
                const next = new Set(prev)
                isOpen ? next.delete(chapter.id) : next.add(chapter.id)
                return next
              })

              return (
                <div key={chapter.id} className="glass rounded-xl overflow-hidden">
                  {/* Chapter header — always visible */}
                  <button
                    onClick={toggle}
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
                  >
                    <span className="text-xl shrink-0">{chapter.icon}</span>
                    <div className="flex-1 min-w-0">
                      {chapter.part && (
                        <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider mb-0.5">{chapter.part}</p>
                      )}
                      <h3 className="text-sm font-semibold text-slate-900">Ch.{chapter.id}: {chapter.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{chapter.description}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5" />
                        {chapter.topics.length}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {/* Topic list — expanded */}
                  {isOpen && (
                    <div className="border-t border-slate-100">
                      {chapter.topics.map((topic, idx) => {
                        const typeConf = ASSESSMENT_LABELS[topic.assessmentType] ?? ASSESSMENT_LABELS['quiz']
                        return (
                          <div
                            key={topic.id}
                            className={`flex items-center gap-3 px-4 py-2.5 ${idx < chapter.topics.length - 1 ? 'border-b border-slate-50' : ''}`}
                          >
                            {/* Lock / number */}
                            <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-slate-100">
                              {enrolled
                                ? <span className="text-[10px] font-bold text-slate-500">{idx + 1}</span>
                                : <Lock className="w-3 h-3 text-slate-400" />
                              }
                            </div>

                            {/* Title */}
                            <span className="flex-1 text-xs text-slate-700 leading-snug">{topic.title}</span>

                            {/* Assessment type badge */}
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${typeConf.color}`}>
                              {typeConf.label}
                            </span>

                            {/* XP */}
                            <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-0.5">
                              <Zap className="w-2.5 h-2.5" />{topic.xp}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Capstone project */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
              <Layers className="w-5 h-5 text-amber-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-amber-600 font-semibold">Capstone Project</p>
                <h3 className="text-sm font-semibold text-slate-900">{course.project.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{course.project.milestones.length} guided milestones</p>
              </div>
              {!enrolled && <Lock className="w-4 h-4 text-amber-400 shrink-0" />}
            </div>
          </div>
          {!enrolled && (
            <p className="mt-3 text-xs text-slate-400 flex items-center gap-1.5">
              <Lock className="w-3 h-3" />
              Enroll to unlock all topics and start learning
            </p>
          )}
        </div>

        {/* Certificate */}
        <div className="glass rounded-2xl p-6 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 mb-1">Earn a Certificate</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Complete all chapters and the capstone project to receive a shareable certificate with a unique verification URL.
              Showcase your expertise on LinkedIn and in your portfolio.
            </p>
          </div>
        </div>

      </div>
    </main>
  )
}
