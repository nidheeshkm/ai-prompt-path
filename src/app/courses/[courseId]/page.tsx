'use client'

import { useParams, useRouter } from 'next/navigation'
import { getCourse, getCourseTotalXP } from '@/data/curriculum'
import { useAuth } from '@/lib/auth-context'
import { useEnrollment } from '@/lib/enrollment-context'
import Link from 'next/link'
import { BookOpen, Clock, Trophy, ChevronRight, CheckCircle, Layers, ArrowLeft, Award } from 'lucide-react'
import { useState } from 'react'

export default function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const { user } = useAuth()
  const { isEnrolled, enroll } = useEnrollment()
  const router = useRouter()
  const [enrolling, setEnrolling] = useState(false)

  const course = getCourse(courseId)
  if (!course) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Course not found.</p>
      </main>
    )
  }

  const enrolled = user ? isEnrolled(courseId) : false
  const totalTopics = course.chapters.flatMap(c => c.topics).length
  const totalXP = getCourseTotalXP(courseId)

  const handleEnroll = async () => {
    if (!user) { router.push('/auth/signup'); return }
    setEnrolling(true)
    await enroll(courseId)
    router.push(`/learn/${courseId}`)
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <Link href="/courses" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200">
          <ArrowLeft className="w-4 h-4" />
          Back to Catalog
        </Link>

        {/* Hero */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-8">
          <div className="flex items-start gap-5">
            <span className="text-5xl">{course.icon}</span>
            <div className="flex-1">
              <p className="text-emerald-400 text-sm font-medium capitalize mb-1">{course.level} · ~{course.estimatedHours} hours</p>
              <h1 className="text-3xl font-bold text-white mb-2">{course.title}</h1>
              <p className="text-gray-300 text-base">{course.tagline}</p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {course.tags.map(tag => (
                  <span key={tag} className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">{tag}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-700">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{course.chapters.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">Chapters</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{totalTopics}</p>
              <p className="text-xs text-gray-400 mt-0.5">Topics</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{totalXP.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-0.5">XP Available</p>
            </div>
          </div>

          {/* Enroll CTA */}
          <div className="mt-6">
            {enrolled ? (
              <Link
                href={`/learn/${courseId}`}
                className="flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-6 py-3 rounded-xl transition-colors group"
              >
                Continue Learning
                <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ) : (
              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-medium px-6 py-3 rounded-xl transition-colors"
              >
                {enrolling ? 'Enrolling…' : user ? 'Enroll & Start Learning' : 'Sign up to Enroll'}
              </button>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <h2 className="text-xl font-bold text-white mb-3">About this Course</h2>
          <p className="text-gray-400 leading-relaxed">{course.description}</p>
        </div>

        {/* Curriculum */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4">Curriculum</h2>
          <div className="space-y-3">
            {course.chapters.map((chapter) => (
              <div key={chapter.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{chapter.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-emerald-400 font-medium">{chapter.part}</p>
                    <h3 className="text-sm font-semibold text-white">Ch.{chapter.id}: {chapter.title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{chapter.description}</p>
                  </div>
                  <span className="text-xs text-gray-500 shrink-0">{chapter.topics.length} topics</span>
                </div>
              </div>
            ))}

            {/* Project */}
            <div className="bg-amber-900/10 border border-amber-800/30 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Layers className="w-6 h-6 text-amber-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-amber-400 font-medium">Capstone Project</p>
                  <h3 className="text-sm font-semibold text-white">{course.project.title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{course.project.milestones.length} guided milestones</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Certificate */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex items-start gap-4">
          <Award className="w-8 h-8 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-white mb-1">Earn a Certificate</h3>
            <p className="text-sm text-gray-400">
              Complete all chapters and the capstone project to receive a shareable certificate with a unique verification URL.
              Showcase your expertise on LinkedIn and in your portfolio.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
