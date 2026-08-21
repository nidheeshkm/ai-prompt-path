'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { getLevelForXp, getXpProgress, getNextLevel } from '@/lib/gamification'
import { Flame, LogOut, Menu, X, Settings, Zap, ChevronRight } from 'lucide-react'
import { useState } from 'react'

export default function Header() {
  const { user, profile, signOut, loading } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const level = profile ? getLevelForXp(profile.xp) : { level: 1, title: 'Novice' }
  const progress = profile ? getXpProgress(profile.xp) : { current: 0, needed: 300, percentage: 0 }
  const nextLevel = profile ? getNextLevel(profile.xp) : null

  if (loading) return (
    <header className="h-16 border-b border-white/[0.06] bg-[#080b14]/80 backdrop-blur-xl" />
  )

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#080b14]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-2.5 shrink-0 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:scale-105 transition-transform">
            <span className="text-base leading-none">🦜</span>
          </div>
          <span className="text-base font-bold hidden sm:inline bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
            PromptPath
          </span>
        </Link>

        {user && profile ? (
          <>
            {/* Desktop HUD */}
            <div className="hidden md:flex items-center gap-2 flex-1 justify-end">

              {/* Nav links */}
              <Link href="/dashboard" className="text-sm text-white/60 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/[0.06] transition-all">
                Dashboard
              </Link>
              <Link href="/courses" className="text-sm text-white/60 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/[0.06] transition-all">
                Courses
              </Link>

              <div className="w-px h-5 bg-white/10 mx-1" />

              {/* Streak badge */}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-semibold ${
                (profile.current_streak || 0) > 0
                  ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                  : 'bg-white/[0.04] border-white/[0.08] text-white/30'
              }`}>
                <Flame className="w-4 h-4" />
                {profile.current_streak || 0}
              </div>

              {/* XP + Level */}
              <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                    {level.level}
                  </div>
                  <span className="text-xs text-white/50 hidden lg:inline">{level.title}</span>
                </div>

                {/* Mini XP bar */}
                <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden hidden lg:block">
                  <div
                    className="xp-bar h-full rounded-full transition-all duration-700"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>

                <div className="flex items-center gap-1 text-xs text-amber-400 font-semibold">
                  <Zap className="w-3 h-3" />
                  {profile.xp.toLocaleString()}
                </div>
              </div>

              <div className="w-px h-5 bg-white/10 mx-1" />

              {/* Settings */}
              <Link
                href="/settings"
                className="relative p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-all"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
                {!profile.has_openrouter_key && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-amber-400 rounded-full ring-2 ring-[#080b14]" />
                )}
              </Link>

              {/* Sign out */}
              <button
                onClick={signOut}
                className="p-2 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/[0.08] transition-all"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile toggle */}
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 text-white/60 hover:text-white">
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/auth/login" className="text-sm text-white/60 hover:text-white px-3 py-1.5 transition-colors">
              Sign In
            </Link>
            <Link href="/auth/signup" className="flex items-center gap-1 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-lg shadow-emerald-500/25">
              Get Started <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>

      {/* Mobile dropdown */}
      {menuOpen && user && profile && (
        <div className="md:hidden border-t border-white/[0.06] bg-[#080b14]/95 backdrop-blur-xl px-4 py-5 space-y-5">
          {/* HUD row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white">
                {level.level}
              </div>
              <div>
                <p className="text-xs font-semibold text-white">{level.title}</p>
                <p className="text-xs text-white/40">{profile.xp.toLocaleString()} XP</p>
              </div>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-bold ${
              (profile.current_streak || 0) > 0
                ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                : 'bg-white/[0.04] border-white/[0.08] text-white/30'
            }`}>
              <Flame className="w-4 h-4" /> {profile.current_streak || 0}
            </div>
          </div>

          {/* XP bar */}
          <div className="w-full h-2 bg-white/[0.08] rounded-full overflow-hidden">
            <div className="xp-bar h-full rounded-full" style={{ width: `${progress.percentage}%` }} />
          </div>

          {/* Nav */}
          <nav className="flex flex-col gap-1">
            {[
              { href: '/dashboard', label: 'Dashboard' },
              { href: '/courses', label: 'Courses' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="px-3 py-2.5 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-all"
              >
                {label}
              </Link>
            ))}
            <Link
              href="/settings"
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              Settings
              {!profile.has_openrouter_key && (
                <span className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">Key missing</span>
              )}
            </Link>
            <button
              onClick={() => { signOut(); setMenuOpen(false) }}
              className="text-left px-3 py-2.5 rounded-xl text-sm text-red-400/70 hover:text-red-400 hover:bg-red-500/[0.08] transition-all"
            >
              Sign Out
            </button>
          </nav>
        </div>
      )}
    </header>
  )
}
