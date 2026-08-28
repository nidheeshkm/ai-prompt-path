'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type CourseRow = {
  id: string
  title: string
  icon: string
  tagline: string
  enrollments: number
  completions: number
  is_active: boolean
}

export default function AdminCoursesClient({ courses }: { courses: CourseRow[] }) {
  const [toggling, setToggling] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const router = useRouter()

  async function toggleCourse(courseId: string, current: boolean) {
    setToggling(courseId)
    const res = await fetch('/api/admin/courses/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, active: !current }),
    })
    setToggling(null)
    if (res.ok) {
      setToast(`Course ${!current ? 'activated' : 'deactivated'}`)
      setTimeout(() => setToast(''), 3000)
      router.refresh()
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Courses</h1>
        {toast && <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">{toast}</p>}
      </div>

      <div className="space-y-3">
        {courses.map(c => (
          <div key={c.id} className={`bg-white border rounded-xl p-4 flex items-center gap-4 shadow-sm transition-opacity ${!c.is_active ? 'opacity-50 border-slate-200' : 'border-slate-200'}`}>
            <span className="text-2xl shrink-0">{c.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800 text-sm">{c.title}</p>
              <p className="text-xs text-slate-400">{c.tagline}</p>
            </div>
            <div className="flex items-center gap-6 text-xs text-slate-400 shrink-0">
              <span><span className="text-slate-700 font-semibold">{c.enrollments}</span> enrolled</span>
              <span><span className="text-slate-700 font-semibold">{c.completions}</span> completed</span>
            </div>
            {!c.is_active && (
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full shrink-0">Inactive</span>
            )}
            <button
              onClick={() => toggleCourse(c.id, c.is_active)}
              disabled={toggling === c.id}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 ${
                c.is_active
                  ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                  : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              {toggling === c.id ? '…' : c.is_active ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-400">Deactivated courses prevent new enrollments. Existing learners keep access.</p>
    </div>
  )
}
