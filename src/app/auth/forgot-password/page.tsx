'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowRight, ArrowLeft, MailCheck } from 'lucide-react'
import AuthPageShell from '@/components/AuthPageShell'

export default function ForgotPasswordPage() {
  const [email, setEmail]   = useState('')
  const [sent, setSent]     = useState(false)
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    if (error) { setError(error.message); setLoading(false) }
    else { setSent(true); setLoading(false) }
  }

  return (
    <AuthPageShell
      headline={sent ? 'Check your inbox' : 'Reset your password'}
      subtitle={sent
        ? 'A reset link is on its way — click it to set a new password.'
        : "Enter your account email and we'll send a secure reset link."}
      switchSlot={
        <Link href="/auth/login"
              className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-semibold transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div className="text-center py-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-5">
            <MailCheck className="w-7 h-7 text-emerald-500" />
          </div>
          <p className="text-sm text-slate-500 leading-relaxed mb-1">Reset link sent to</p>
          <p className="text-sm font-semibold text-slate-800 mb-5">{email}</p>
          <p className="text-[12px] text-slate-400 leading-relaxed mb-5">
            The link expires in 1 hour. Check spam if you don&apos;t see it.
          </p>
          <button
            onClick={() => { setSent(false); setEmail('') }}
            className="text-[12px] text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
          >
            Try a different email →
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Email address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 outline-none transition-all focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 focus:bg-white"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
              <span className="shrink-0">⚠</span><span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg,#10B981 0%,#06B6D4 100%)', boxShadow: '0 4px 14px rgba(16,185,129,0.30)' }}
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Sending…
              </>
            ) : (
              <>Send Reset Link <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>
      )}
    </AuthPageShell>
  )
}
