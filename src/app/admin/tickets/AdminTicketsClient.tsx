'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Clock, MessageSquare } from 'lucide-react'

type Ticket = {
  id: string
  user_id: string
  userName: string
  userEmail: string
  type: string
  message: string
  status: 'pending' | 'approved' | 'rejected'
  admin_note: string | null
  created_at: string
}

export default function AdminTicketsClient({
  tickets: initial,
  pendingCount,
}: {
  tickets: Ticket[]
  pendingCount: number
}) {
  const [tickets, setTickets] = useState(initial)
  const [filter, setFilter] = useState<'pending' | 'all'>('pending')
  const [resolving, setResolving] = useState<string | null>(null)
  const [noteInput, setNoteInput] = useState<Record<string, string>>({})
  const [toast, setToast] = useState('')
  const router = useRouter()

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  async function resolve(ticketId: string, action: 'approve' | 'reject') {
    const label = action === 'approve' ? 'approve' : 'reject'
    if (!confirm(`${label.charAt(0).toUpperCase() + label.slice(1)} this request?`)) return
    setResolving(ticketId)
    const res = await fetch('/api/admin/tickets/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketId, action, note: noteInput[ticketId] ?? '' }),
    })
    setResolving(null)
    if (res.ok) {
      setTickets(prev =>
        prev.map(t => t.id === ticketId ? { ...t, status: action === 'approve' ? 'approved' : 'rejected' } : t)
      )
      showToast(action === 'approve' ? 'User unblocked and request approved' : 'Request rejected')
      router.refresh()
    } else {
      showToast('Failed to resolve ticket')
    }
  }

  const displayed = tickets.filter(t => filter === 'pending' ? t.status === 'pending' : true)

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Support Tickets</h1>
          {pendingCount > 0 && (
            <p className="text-sm text-amber-600 mt-0.5">
              {pendingCount} pending request{pendingCount !== 1 ? 's' : ''} waiting for review
            </p>
          )}
        </div>
        {toast && (
          <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
            {toast}
          </p>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {(['pending', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
              filter === f
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {f === 'pending' ? `Pending (${pendingCount})` : 'All'}
          </button>
        ))}
      </div>

      {/* Tickets list */}
      <div className="space-y-3">
        {displayed.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
            <MessageSquare className="w-8 h-8 text-slate-200 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No {filter === 'pending' ? 'pending ' : ''}tickets</p>
          </div>
        ) : (
          displayed.map(t => (
            <div
              key={t.id}
              className={`bg-white border rounded-xl p-5 shadow-sm space-y-4 ${
                t.status === 'pending'
                  ? 'border-amber-200'
                  : t.status === 'approved'
                  ? 'border-emerald-200'
                  : 'border-slate-200'
              }`}
            >
              {/* Ticket header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-800">{t.userName}</p>
                    <p className="text-xs text-slate-400">{t.userEmail}</p>
                    <StatusBadge status={t.status} />
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Submitted {new Date(t.created_at).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>

              {/* Message */}
              <div className="bg-slate-50 border border-slate-100 rounded-lg px-4 py-3">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">User message</p>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{t.message}</p>
              </div>

              {/* Actions (only for pending) */}
              {t.status === 'pending' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">
                      Admin note (optional)
                    </label>
                    <input
                      type="text"
                      value={noteInput[t.id] ?? ''}
                      onChange={e => setNoteInput(prev => ({ ...prev, [t.id]: e.target.value }))}
                      placeholder="Reason for your decision…"
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => resolve(t.id, 'approve')}
                      disabled={resolving === t.id}
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {resolving === t.id ? 'Processing…' : 'Approve & Unblock'}
                    </button>
                    <button
                      onClick={() => resolve(t.id, 'reject')}
                      disabled={resolving === t.id}
                      className="flex items-center gap-1.5 bg-white hover:bg-red-50 border border-red-200 disabled:opacity-50 text-red-600 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>
              )}

              {/* Show admin note on resolved tickets */}
              {t.status !== 'pending' && t.admin_note && (
                <div className="bg-slate-50 border border-slate-100 rounded-lg px-4 py-3">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Admin note</p>
                  <p className="text-sm text-slate-600">{t.admin_note}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: Ticket['status'] }) {
  if (status === 'pending') return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
      <Clock className="w-3 h-3" /> Pending
    </span>
  )
  if (status === 'approved') return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600">
      <CheckCircle className="w-3 h-3" /> Approved
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-600">
      <XCircle className="w-3 h-3" /> Rejected
    </span>
  )
}
