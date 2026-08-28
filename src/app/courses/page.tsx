'use client'

import { courses } from '@/data/curriculum'
import { useAuth } from '@/lib/auth-context'
import { useEnrollment } from '@/lib/enrollment-context'
import { useProgress } from '@/lib/progress-context'
import Link from 'next/link'
import { BookOpen, Clock, Trophy, ChevronRight, Award, Sparkles, BookPlus, Send, CheckCircle } from 'lucide-react'
import { useState } from 'react'

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

function CourseRequestForm() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function submit() {
    if (!title.trim() || !description.trim()) return
    setState('sending')
    try {
      const res = await fetch('/api/courses/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Something went wrong.')
        setState('error')
      } else {
        setState('sent')
      }
    } catch {
      setErrorMsg('Could not reach server.')
      setState('error')
    }
  }

  if (!user) return null

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
            <BookPlus className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-sm">Can't find what you're looking for?</p>
            <p className="text-xs text-slate-500">Request a new course topic — we review every submission.</p>
          </div>
        </div>
        {!open && state !== 'sent' && (
          <button
            onClick={() => setOpen(true)}
            className="shrink-0 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-4 py-2 rounded-lg transition-colors"
          >
            Request a Course
          </button>
        )}
      </div>

      {state === 'sent' ? (
        <div className="mt-4 flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm font-medium">
          <CheckCircle className="w-4 h-4 shrink-0" />
          Request submitted — thanks! We'll review it soon.
        </div>
      ) : open && (
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Course topic / title</label>
            <input
              type="text"
              value={title}
              onChange={e => { setTitle(e.target.value); setState('idle'); setErrorMsg('') }}
              placeholder="e.g. Advanced RAG with LangChain"
              className="w-full border border-slate-200 focus:border-amber-400 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-300 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">What do you want to learn?</label>
            <textarea
              rows={3}
              value={description}
              onChange={e => { setDescription(e.target.value); setState('idle'); setErrorMsg('') }}
              placeholder="Describe the concepts, tools, or skills you'd like covered…"
              className="w-full border border-slate-200 focus:border-amber-400 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-300 focus:outline-none resize-none"
            />
          </div>
          {state === 'error' && (
            <p className="text-xs text-red-500">{errorMsg}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={state === 'sending' || !title.trim() || !description.trim()}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              {state === 'sending' ? 'Submitting…' : 'Submit Request'}
            </button>
            <button
              onClick={() => { setOpen(false); setState('idle'); setTitle(''); setDescription(''); setErrorMsg('') }}
              className="text-sm font-medium text-slate-500 hover:text-slate-700 px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

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
            Build skills that <span className="gradient-text">hold up under pressure</span>
          </h1>
          <p className="text-slate-500 mt-2 text-sm">Hands-on courses with AI-graded assessments, mastery-gated progress, and certificates.</p>
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

        <CourseRequestForm />
      </div>
    </main>
  )
}
