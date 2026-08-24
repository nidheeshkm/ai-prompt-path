'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Eye, EyeOff, MailCheck } from 'lucide-react'
import AuthPageShell from '@/components/AuthPageShell'

const PW_STRENGTH = {
  weak:   { label: 'Too short',  bar: 'w-1/3  bg-red-400',    text: 'text-red-500' },
  fair:   { label: 'Fair',       bar: 'w-2/3  bg-amber-400',  text: 'text-amber-600' },
  strong: { label: 'Strong',     bar: 'w-full bg-emerald-500', text: 'text-emerald-600' },
}

export default function SignupPage() {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [showPw, setShowPw]           = useState(false)
  const [error, setError]             = useState('')
  const [loading, setLoading]         = useState(false)
  const [sent, setSent]               = useState(false)
  const router = useRouter()

  const pwLevel = password.length === 0 ? null
    : password.length < 6  ? 'weak'
    : password.length < 10 ? 'fair'
    : 'strong'

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    })

    if (err) { setError(err.message); setLoading(false); return }
    if (data.user) {
      if (data.session) router.push('/dashboard')
      else setSent(true)
    }
    setLoading(false)
  }

  if (sent) {
    return (
      <AuthPageShell
        headline="One last step"
        subtitle="Check your inbox and confirm your email to activate your account."
        switchSlot={
          <Link href="/auth/login" className="text-emerald-600 hover:text-emerald-700 font-semibold transition-colors">
            Back to sign in
          </Link>
        }
      >
        <div className="text-center py-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-5">
            <MailCheck className="w-7 h-7 text-emerald-500" />
          </div>
          <p className="text-sm text-slate-500 leading-relaxed mb-2">
            We sent a confirmation link to
          </p>
          <p className="text-sm font-semibold text-slate-800 mb-5">{email}</p>
          <p className="text-[12px] text-slate-400 leading-relaxed">
            The link expires in 1 hour. Check your spam folder if you don&apos;t see it.
          </p>
          <button
            onClick={() => setSent(false)}
            className="mt-6 text-[12px] text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
          >
            Try a different email →
          </button>
        </div>
      </AuthPageShell>
    )
  }

  return (
    <AuthPageShell
      headline="Start building skills that stick"
      subtitle="Every topic you complete is earned — proven through real assessments, graded by AI."
      switchSlot={
        <span>
          Already have an account?{' '}
          <Link href="/auth/login" className="text-emerald-600 hover:text-emerald-700 font-semibold transition-colors">
            Sign in
          </Link>
        </span>
      }
    >
      {/* Trust chips */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        {['Free to join', 'No credit card', 'Start immediately'].map(t => (
          <span key={t}
                className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
            ✓ {t}
          </span>
        ))}
      </div>

      <form onSubmit={handleSignup} className="space-y-4">

        {/* Display name */}
        <div>
          <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Your name</label>
          <input
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="What should we call you?"
            autoComplete="name"
            className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 outline-none transition-all focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 focus:bg-white"
          />
        </div>

        {/* Email */}
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

        {/* Password */}
        <div>
          <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Password</label>
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

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
            <span className="shrink-0">⚠</span><span>{error}</span>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
          style={{ background: 'linear-gradient(135deg,#10B981 0%,#06B6D4 100%)', boxShadow: '0 4px 14px rgba(16,185,129,0.30)' }}
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Creating account…
            </>
          ) : (
            <>Start Learning Free <ArrowRight className="w-4 h-4" /></>
          )}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 pt-1">
          <div className="flex-1 h-px bg-slate-100" />
          <span className="text-[11px] text-slate-400 font-medium">Already have an account?</span>
          <div className="flex-1 h-px bg-slate-100" />
        </div>

        <Link
          href="/auth/login"
          className="flex items-center justify-center w-full py-3 text-sm font-semibold text-slate-700 rounded-xl border-2 border-slate-200 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50/50 transition-all"
        >
          Sign in instead
        </Link>
      </form>
    </AuthPageShell>
  )
}
