'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Mail, Flame, Zap, BookOpen, ShieldCheck, Ban, CheckCircle, Eye } from 'lucide-react'
import Link from 'next/link'

type User = {
  id: string
  display_name: string | null
  email: string
  xp: number
  current_streak: number
  is_admin: boolean
  is_blocked: boolean
  enrollments: number
  created_at: string
}

export default function AdminUsersClient({ users: initial }: { users: User[] }) {
  const [users, setUsers] = useState(initial)
  const [query, setQuery] = useState('')
  const [sending, setSending] = useState<string | null>(null)
  const [blocking, setBlocking] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const router = useRouter()

  const filtered = users.filter(u =>
    (u.display_name ?? '').toLowerCase().includes(query.toLowerCase()) ||
    u.email.toLowerCase().includes(query.toLowerCase())
  )

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  async function resetPassword(email: string) {
    if (!email) return
    setSending(email)
    const res = await fetch('/api/admin/users/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setSending(null)
    showToast(res.ok ? `Reset link sent to ${email}` : 'Failed to send reset link')
  }

  async function toggleBlock(u: User) {
    const action = u.is_blocked ? 'unblock' : 'block'
    if (!confirm(`${action === 'block' ? 'Block' : 'Unblock'} ${u.display_name || u.email}?`)) return
    setBlocking(u.id)
    const res = await fetch('/api/admin/users/block', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: u.id, block: !u.is_blocked }),
    })
    setBlocking(null)
    if (res.ok) {
      setUsers(prev => prev.map(p => p.id === u.id ? { ...p, is_blocked: !p.is_blocked } : p))
      showToast(`${u.display_name || u.email} ${action}ed`)
    } else {
      showToast(`Failed to ${action} user`)
    }
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">
          Users <span className="text-slate-400 text-lg font-normal">({users.length})</span>
        </h1>
        {toast && (
          <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
            {toast}
          </p>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-400 shadow-sm"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left">
              <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">User</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> XP</span>
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                <span className="flex items-center gap-1"><Flame className="w-3 h-3" /> Streak</span>
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> Courses</span>
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Joined</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(u => (
              <tr key={u.id} className={`hover:bg-slate-50 transition-colors ${u.is_blocked ? 'opacity-60' : ''}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {u.is_admin && <ShieldCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" aria-label="Admin" />}
                    <div>
                      <p className="font-medium text-slate-800">{u.display_name || 'Unnamed'}</p>
                      <p className="text-xs text-slate-400">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-amber-600 font-semibold">{u.xp.toLocaleString()}</td>
                <td className="px-4 py-3 text-orange-500">{u.current_streak}d</td>
                <td className="px-4 py-3 text-slate-600">{u.enrollments}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  {u.is_blocked ? (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-600">
                      <Ban className="w-3 h-3" /> Blocked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600">
                      <CheckCircle className="w-3 h-3" /> Active
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-amber-600 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" /> View
                    </Link>
                    <button
                      onClick={() => resetPassword(u.email)}
                      disabled={!u.email || sending === u.email}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-600 disabled:opacity-40 transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      {sending === u.email ? 'Sending…' : 'Reset pwd'}
                    </button>
                    {!u.is_admin && (
                      <button
                        onClick={() => toggleBlock(u)}
                        disabled={blocking === u.id}
                        className={`flex items-center gap-1 text-xs transition-colors disabled:opacity-40 ${
                          u.is_blocked
                            ? 'text-slate-400 hover:text-emerald-600'
                            : 'text-slate-400 hover:text-red-500'
                        }`}
                      >
                        {u.is_blocked
                          ? <><CheckCircle className="w-3.5 h-3.5" />{blocking === u.id ? 'Unblocking…' : 'Unblock'}</>
                          : <><Ban className="w-3.5 h-3.5" />{blocking === u.id ? 'Blocking…' : 'Block'}</>
                        }
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">No users found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
