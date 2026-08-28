'use client'

import { useState } from 'react'
import { ShieldOff, Send, CheckCircle, AlertCircle } from 'lucide-react'

export default function BlockedPage() {
  const [message, setMessage] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error' | 'already_pending'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    setState('sending')
    try {
      const res = await fetch('/api/support/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setState('sent')
      } else if (data.error === 'already_pending') {
        setState('already_pending')
      } else {
        setErrorMsg(data.error ?? 'Something went wrong')
        setState('error')
      }
    } catch {
      setErrorMsg('Could not reach server')
      setState('error')
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-red-100 border border-red-200 flex items-center justify-center mx-auto">
            <ShieldOff className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Account Suspended</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Your account has been suspended by an administrator. You can submit a request below to have it reviewed.
          </p>
        </div>

        {/* Ticket form */}
        <div className="glass rounded-xl p-6 space-y-4">
          {state === 'sent' ? (
            <div className="text-center py-4 space-y-2">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="font-semibold text-slate-800">Request submitted</p>
              <p className="text-sm text-slate-500">
                An administrator will review your request. You'll be able to log in once it's approved.
              </p>
            </div>
          ) : state === 'already_pending' ? (
            <div className="text-center py-4 space-y-2">
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
              <p className="font-semibold text-slate-800">Request already submitted</p>
              <p className="text-sm text-slate-500">
                You already have a pending unblock request. Please wait for an administrator to review it.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Request Unblock
                </label>
                <p className="text-xs text-slate-400 mb-3">
                  Explain why your account should be reinstated. Be specific — this goes directly to an administrator.
                </p>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="e.g. I believe my account was suspended by mistake. I have not violated any terms of service…"
                  rows={5}
                  maxLength={1000}
                  required
                  className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:border-amber-400 resize-none"
                />
                <p className="text-right text-xs text-slate-300 mt-1">{message.length}/1000</p>
              </div>

              {state === 'error' && (
                <p className="text-sm text-red-600 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={state === 'sending' || !message.trim()}
                className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-medium text-sm px-4 py-2.5 rounded-xl transition-colors"
              >
                {state === 'sending' ? (
                  <span className="animate-pulse">Sending…</span>
                ) : (
                  <><Send className="w-4 h-4" /> Submit Request</>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Sign out */}
        <p className="text-center text-xs text-slate-400">
          Wrong account?{' '}
          <button
            onClick={async () => {
              await fetch('/api/auth/signout', { method: 'POST' })
              window.location.href = '/'
            }}
            className="text-slate-500 underline underline-offset-2 hover:text-slate-700"
          >
            Sign out
          </button>
        </p>
      </div>
    </main>
  )
}
