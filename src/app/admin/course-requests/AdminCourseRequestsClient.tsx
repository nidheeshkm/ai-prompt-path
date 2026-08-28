'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Clock, BookPlus } from 'lucide-react'

type CourseRequest = {
  id: string
  user_id: string
  userName: string
  userEmail: string
  title: string
  description: string
  status: 'pending' | 'noted' | 'rejected'
  admin_note: string | null
  created_at: string
}

const STATUS_CONFIG = {
  pending: { label: 'Pending', icon: Clock, class: 'text-amber-700 bg-amber-50 border-amber-200' },
  noted:   { label: 'Noted',   icon: CheckCircle, class: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  rejected:{ label: 'Rejected',icon: XCircle, class: 'text-slate-500 bg-slate-50 border-slate-200' },
}

export default function AdminCourseRequestsClient({ requests: initial }: { requests: CourseRequest[] }) {
  const [requests, setRequests] = useState(initial)
  const [filter, setFilter] = useState<'pending' | 'all'>('pending')
  const [resolving, setResolving] = useState<string | null>(null)
  const [noteInput, setNoteInput] = useState<Record<string, string>>({})
  const [toast, setToast] = useState('')
  const router = useRouter()

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  async function resolve(requestId: string, action: 'noted' | 'rejected') {
    setResolving(requestId)
    const res = await fetch('/api/admin/course-requests/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, action, note: noteInput[requestId] ?? '' }),
    })
    setResolving(null)
    if (res.ok) {
      setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: action } : r))
      showToast(action === 'noted' ? 'Marked as noted.' : 'Request rejected.')
      router.refresh()
    } else {
      showToast('Something went wrong.')
    }
  }

  const visible = filter === 'pending'
    ? requests.filter(r => r.status === 'pending')
    : requests

  const pendingCount = requests.filter(r => r.status === 'pending').length

  return (
    <div className="flex-1 overflow-y-auto p-6 relative">
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-xl z-50">
          {toast}
        </div>
      )}

      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <BookPlus className="w-5 h-5 text-amber-500" />
          <h1 className="text-xl font-bold text-slate-900">Course Requests</h1>
          {pendingCount > 0 && (
            <span className="text-xs font-bold bg-red-500 text-white rounded-full px-2 py-0.5">
              {pendingCount}
            </span>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
          {(['pending', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                filter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {f === 'pending' ? `Pending (${pendingCount})` : 'All'}
            </button>
          ))}
        </div>

        {visible.length === 0 && (
          <div className="text-center py-16 text-slate-400 text-sm">
            {filter === 'pending' ? 'No pending requests.' : 'No requests yet.'}
          </div>
        )}

        {visible.map(req => {
          const cfg = STATUS_CONFIG[req.status]
          const StatusIcon = cfg.icon
          const isResolving = resolving === req.id

          return (
            <div key={req.id} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 text-sm">{req.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {req.userName} · {req.userEmail} ·{' '}
                    {new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <span className={`shrink-0 inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border ${cfg.class}`}>
                  <StatusIcon className="w-3 h-3" />
                  {cfg.label}
                </span>
              </div>

              {/* Description */}
              <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-lg px-4 py-3">
                {req.description}
              </p>

              {/* Existing admin note */}
              {req.admin_note && (
                <p className="text-xs text-slate-500 italic">Admin note: {req.admin_note}</p>
              )}

              {/* Actions for pending */}
              {req.status === 'pending' && (
                <div className="space-y-2 pt-1">
                  <input
                    type="text"
                    placeholder="Optional note to self…"
                    value={noteInput[req.id] ?? ''}
                    onChange={e => setNoteInput(prev => ({ ...prev, [req.id]: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:border-amber-400"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => resolve(req.id, 'noted')}
                      disabled={isResolving}
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Mark as Noted
                    </button>
                    <button
                      onClick={() => resolve(req.id, 'rejected')}
                      disabled={isResolving}
                      className="flex items-center gap-1.5 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-600 text-sm font-medium px-4 py-2 rounded-lg border border-slate-200 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
