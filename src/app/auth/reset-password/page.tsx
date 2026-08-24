'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import AuthPageShell from '@/components/AuthPageShell'

const PW_STRENGTH = {
  weak:   { label: 'Too short',  bar: 'w-1/3  bg-red-400',    text: 'text-red-500' },
  fair:   { label: 'Fair',       bar: 'w-2/3  bg-amber-400',  text: 'text-amber-600' },
  strong: { label: 'Strong',     bar: 'w-full bg-emerald-500', text: 'text-emerald-600' },
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [showCf, setShowCf]     = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [done, setDone]         = useState(false)
  const [ready, setReady]       = useState(false)
  const router = useRouter()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const pwLevel = password.length === 0 ? null
    : password.length < 6  ? 'weak'
    : password.length < 10 ? 'fair'
    : 'strong'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 6)  { setError('Password must be at least 6 characters.'); return }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false) }
    else { setDone(true); setTimeout(() => router.push('/dashboard'), 2500) }
  }

  const headline = done ? 'All set — password updated' : ready ? 'Set your new password' : 'Verifying your link…'
  const subtitle  = done
    ? 'Your password has been reset. Redirecting you to your dashboard in a moment.'
    : ready
    ? 'Choose something strong. You only need to do this once.'
    : 'Just a moment while we verify your reset link.'

  return (
    <AuthPageShell
      headline={headline}
      subtitle={subtitle}
      switchSlot={
        done ? (
          <Link href="/dashboard" className="text-emerald-600 hover:text-emerald-700 font-semibold transition-colors">
            Go to Dashboard →
          </Link>
        ) : (
          <Link href="/auth/login" className="text-emerald-600 hover:text-emerald-700 font-semibold transition-colors">
            Back to sign in
          </Link>
        )
      }
    >
      {done ? (
        <div className="text-center py-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-5">
            <ShieldCheck className="w-7 h-7 text-emerald-500" />
          </div>
          <p className="text-sm text-slate-500 leading-relaxed">
            Redirecting to your dashboard…
          </p>
          <Link href="/dashboard"
                className="inline-flex items-center gap-1 mt-4 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
            Go now <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

      ) : !ready ? (
        <div className="text-center py-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-5 animate-pulse">
            <ShieldCheck className="w-7 h-7 text-slate-400" />
          </div>
          <p className="text-sm text-slate-500 leading-relaxed">
            If nothing happens,{' '}
            <Link href="/auth/forgot-password" className="text-emerald-600 underline underline-offset-2">
              request a new link
            </Link>.
          </p>
        </div>

      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* New password */}
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">New password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                autoComplete="new-password"
                minLength={6}
                required
                className="w-full px-4 py-3 pr-11 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 outline-none transition-all focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 focus:bg-white"
              />
              <button type="button" tabIndex={-1} onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {pwLevel && (
              <div className="mt-2">
                <div className="w-full bg-slate-100 rounded-full h-1">
                  <div className={`h-1 rounded-full transition-all duration-300 ${PW_STRENGTH[pwLevel].bar}`} />
                </div>
                <p className={`text-[11px] mt-1 font-medium ${PW_STRENGTH[pwLevel].text}`}>
                  {PW_STRENGTH[pwLevel].label}
                </p>
              </div>
            )}
          </div>

          {/* Confirm */}
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Confirm password</label>
            <div className="relative">
              <input
                type={showCf ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Re-enter password"
                autoComplete="new-password"
                required
                className={`w-full px-4 py-3 pr-11 text-sm rounded-xl border bg-slate-50 text-slate-900 placeholder-slate-400 outline-none transition-all focus:bg-white ${
                  confirm && confirm !== password
                    ? 'border-red-300 focus:ring-2 focus:ring-red-500/20 focus:border-red-400'
                    : 'border-slate-200 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400'
                }`}
              />
              <button type="button" tabIndex={-1} onClick={() => setShowCf(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                {showCf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirm && confirm !== password && (
              <p className="text-[11px] text-red-500 mt-1 font-medium">Passwords don&apos;t match</p>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
              <span className="shrink-0">⚠</span><span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (!!confirm && confirm !== password)}
            className="w-full py-3 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg,#10B981 0%,#06B6D4 100%)', boxShadow: '0 4px 14px rgba(16,185,129,0.30)' }}
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Updating…
              </>
            ) : (
              <>Update Password <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>
      )}
    </AuthPageShell>
  )
}
