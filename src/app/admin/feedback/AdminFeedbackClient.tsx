'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bug, Lightbulb, Clock, CheckCircle, Eye, EyeOff, ChevronDown, ImageIcon, Tag } from 'lucide-react'

type FeedbackStatus = 'pending' | 'acknowledged' | 'resolved' | 'dismissed'

type Ticket = {
  id: string
  user_id: string
  userName: string
  userEmail: string
  type: 'feedback' | 'bug'
  category: string | null
  message: string
  status: FeedbackStatus
  priority: 'low' | 'normal' | 'high'
  admin_note: string | null
  course_id: string | null
  topic_id: string | null
  screenshot_url: string | null
  screenshotSignedUrl: string | null
  created_at: string
}

const CATEGORY_LABELS: Record<string, string> = {
  content_error:    'Content Error',
  technical_issue:  'Technical Issue',
  ui_problem:       'UI Problem',
  missing_content:  'Missing Content',
  other:            'Other',
}

const STATUS_ACTIONS: { value: Exclude<FeedbackStatus, 'pending'>; label: string; className: string }[] = [
  { value: 'acknowledged', label: 'Acknowledge',        className: 'bg-blue-600 hover:bg-blue-700 text-white' },
  { value: 'resolved',     label: 'Mark Resolved',      className: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
  { value: 'dismissed',    label: 'Dismiss',            className: 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-600' },
]

export default function AdminFeedbackClient({
  tickets: initial,
  pendingCount,
}: {
  tickets: Ticket[]
  pendingCount: number
}) {
  const [tickets, setTickets]         = useState(initial)
  const [typeFilter, setTypeFilter]   = useState<'all' | 'feedback' | 'bug'>('all')
  const [statusFilter, setStatusFilter] = useState<'pending' | 'all'>('pending')
  const [acting, setActing]           = useState<string | null>(null)
  const [noteInput, setNoteInput]     = useState<Record<string, string>>({})
  const [expanded, setExpanded]       = useState<Record<string, boolean>>({})
  const [toast, setToast]             = useState('')
  const router = useRouter()

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  function toggle(id: string) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  async function act(ticketId: string, status: Exclude<FeedbackStatus, 'pending'>) {
    if (!confirm(`Mark this as "${status}"?`)) return
    setActing(ticketId)
    const res = await fetch('/api/admin/feedback/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketId, status, note: noteInput[ticketId] ?? '' }),
    })
    setActing(null)
    if (res.ok) {
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status } : t))
      showToast(`Marked as ${status}`)
      router.refresh()
    } else {
      const body = await res.json().catch(() => ({}))
      showToast(body.error === 'already resolved' ? 'Already resolved by another admin.' : 'Failed to update.')
    }
  }

  const displayed = tickets.filter(t => {
    const matchType   = typeFilter === 'all' || t.type === typeFilter
    const matchStatus = statusFilter === 'pending' ? t.status === 'pending' : true
    return matchType && matchStatus
  })

  const pendingBugs     = tickets.filter(t => t.type === 'bug'      && t.status === 'pending').length
  const pendingFeedback = tickets.filter(t => t.type === 'feedback'  && t.status === 'pending').length

  return (
    <div className="max-w-4xl space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Feedback & Bug Reports</h1>
          {pendingCount > 0 && (
            <p className="text-sm text-amber-600 mt-0.5">
              {pendingFeedback > 0 && `${pendingFeedback} suggestion${pendingFeedback !== 1 ? 's' : ''}`}
              {pendingFeedback > 0 && pendingBugs > 0 && ' · '}
              {pendingBugs > 0 && `${pendingBugs} bug${pendingBugs !== 1 ? 's' : ''}`}
              {' '}pending review
            </p>
          )}
        </div>
        {toast && (
          <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
            {toast}
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Status */}
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {(['pending', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
                statusFilter === f ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {f === 'pending' ? `Pending (${pendingCount})` : 'All'}
            </button>
          ))}
        </div>

        {/* Type */}
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {([
            { value: 'all',      label: 'All types'   },
            { value: 'bug',      label: `Bugs (${pendingBugs})` },
            { value: 'feedback', label: `Suggestions (${pendingFeedback})` },
          ] as const).map(f => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                typeFilter === f.value ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ticket list */}
      <div className="space-y-3">
        {displayed.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
            <p className="text-slate-400 text-sm">No items match the current filter.</p>
          </div>
        ) : (
          displayed.map(t => {
            const isExpanded = expanded[t.id] ?? false
            return (
              <div
                key={t.id}
                className={`bg-white border rounded-xl shadow-sm overflow-hidden ${
                  t.status === 'pending'
                    ? t.type === 'bug' ? 'border-red-200' : 'border-amber-200'
                    : t.status === 'resolved' ? 'border-emerald-200'
                    : 'border-slate-200'
                }`}
              >
                {/* Card header — always visible */}
                <div
                  className="flex items-start gap-3 p-4 cursor-pointer select-none"
                  onClick={() => toggle(t.id)}
                >
                  <div className={`mt-0.5 rounded-full p-1.5 shrink-0 ${
                    t.type === 'bug' ? 'bg-red-50' : 'bg-amber-50'
                  }`}>
                    {t.type === 'bug'
                      ? <Bug className="w-3.5 h-3.5 text-red-500" />
                      : <Lightbulb className="w-3.5 h-3.5 text-amber-500" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-slate-800">{t.userName}</span>
                      <span className="text-xs text-slate-400">{t.userEmail}</span>
                      <StatusBadge status={t.status} />
                      {t.priority === 'high' && (
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-100 text-red-600">High</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <p className="text-xs text-slate-400">
                        {new Date(t.created_at).toLocaleDateString('en-US', {
                          year: 'numeric', month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                      {t.category && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          <Tag className="w-2.5 h-2.5" />
                          {CATEGORY_LABELS[t.category] ?? t.category}
                        </span>
                      )}
                      {t.topic_id && (
                        <span className="text-[10px] text-slate-400">topic: {t.topic_id}</span>
                      )}
                    </div>
                    {/* Preview of message */}
                    {!isExpanded && (
                      <p className="text-sm text-slate-500 mt-1 line-clamp-2">{t.message}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {t.screenshot_url && (
                      <span title="Has screenshot"><ImageIcon className="w-3.5 h-3.5 text-slate-400" /></span>
                    )}
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-4 border-t border-slate-100 pt-4">
                    {/* Full message */}
                    <div className="bg-slate-50 border border-slate-100 rounded-lg px-4 py-3">
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Message</p>
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{t.message}</p>
                    </div>

                    {/* Screenshot */}
                    {t.screenshotSignedUrl && (
                      <div>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Screenshot</p>
                        <a href={t.screenshotSignedUrl} target="_blank" rel="noreferrer" className="group relative inline-block">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={t.screenshotSignedUrl}
                            alt="User screenshot"
                            className="max-h-56 max-w-full rounded-lg border border-slate-200 object-contain group-hover:opacity-90 transition-opacity"
                          />
                          <span className="absolute top-2 right-2 bg-black/50 text-white text-[10px] rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            Open full size
                          </span>
                        </a>
                      </div>
                    )}

                    {/* Admin note on resolved */}
                    {t.status !== 'pending' && t.admin_note && (
                      <div className="bg-slate-50 border border-slate-100 rounded-lg px-4 py-3">
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Admin note</p>
                        <p className="text-sm text-slate-600">{t.admin_note}</p>
                      </div>
                    )}

                    {/* Actions for pending */}
                    {t.status === 'pending' && (
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-medium text-slate-500 mb-1 block">Admin note (optional)</label>
                          <input
                            type="text"
                            value={noteInput[t.id] ?? ''}
                            onChange={e => setNoteInput(prev => ({ ...prev, [t.id]: e.target.value }))}
                            placeholder="Internal note about this item…"
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:border-amber-400"
                            onClick={e => e.stopPropagation()}
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {STATUS_ACTIONS.map(({ value, label, className }) => (
                            <button
                              key={value}
                              disabled={acting === t.id}
                              onClick={e => { e.stopPropagation(); act(t.id, value) }}
                              className={`flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${className}`}
                            >
                              {acting === t.id ? 'Working…' : label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: FeedbackStatus }) {
  const map: Record<FeedbackStatus, { label: string; className: string; Icon: typeof Clock }> = {
    pending:      { label: 'Pending',      className: 'bg-amber-50 border-amber-200 text-amber-700',   Icon: Clock },
    acknowledged: { label: 'Acknowledged', className: 'bg-blue-50 border-blue-200 text-blue-600',      Icon: Eye },
    resolved:     { label: 'Resolved',     className: 'bg-emerald-50 border-emerald-200 text-emerald-600', Icon: CheckCircle },
    dismissed:    { label: 'Dismissed',    className: 'bg-slate-100 border-slate-200 text-slate-400',   Icon: EyeOff },
  }
  const { label, className, Icon } = map[status] ?? map.pending
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${className}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  )
}
