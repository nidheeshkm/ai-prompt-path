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

  if (loading) return (
    <header className="h-16 border-b border-black/[0.07] bg-white/90 backdrop-blur-xl" />
  )

  return (
    <header className="sticky top-0 z-50 border-b border-black/[0.07] bg-white/90 backdrop-blur-xl shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-2.5 shrink-0 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-md shadow-emerald-500/25 group-hover:scale-105 transition-transform">
            <span className="text-base leading-none">🦜</span>
          </div>
          <span className="text-base font-bold hidden sm:inline text-slate-900">
            PromptPath
          </span>
        </Link>

        {user && profile ? (
          <>
            {/* Desktop HUD */}
            <div className="hidden md:flex items-center gap-2 flex-1 justify-end">

              {/* Nav links */}
              <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-all">
                Dashboard
              </Link>
              <Link href="/courses" className="text-sm text-slate-500 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-all">
                Courses
              </Link>

              <div className="w-px h-5 bg-slate-200 mx-1" />

              {/* Streak badge */}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-semibold ${
                (profile.current_streak || 0) > 0
                  ? 'bg-orange-50 border-orange-200 text-orange-600'
                  : 'bg-slate-100 border-slate-200 text-slate-400'
              }`}>
                <Flame className="w-4 h-4" />
                {profile.current_streak || 0}
              </div>

              {/* XP + Level */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                    {level.level}
                  </div>
                  <span className="text-xs text-slate-400 hidden lg:inline">{level.title}</span>
                </div>

                {/* Mini XP bar */}
                <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden hidden lg:block">
                  <div
                    className="xp-bar h-full rounded-full transition-all duration-700"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>

                <div className="flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                  <Zap className="w-3 h-3" />
                  {profile.xp.toLocaleString()}
                </div>
              </div>

              <div className="w-px h-5 bg-slate-200 mx-1" />

              {/* Settings */}
              <Link
                href="/settings"
                className="relative p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
                {!profile.has_api_key && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full ring-2 ring-white" />
                )}
              </Link>

              {/* Sign out */}
              <button
                onClick={signOut}
                className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile toggle */}
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 text-slate-500 hover:text-slate-900">
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/auth/login" className="text-sm text-slate-500 hover:text-slate-900 px-3 py-1.5 transition-colors">
              Sign In
            </Link>
            <Link href="/auth/signup" className="flex items-center gap-1 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-md shadow-emerald-500/25">
              Get Started <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>

      {/* Mobile dropdown */}
      {menuOpen && user && profile && (
        <div className="md:hidden border-t border-black/[0.07] bg-white px-4 py-5 space-y-5 shadow-lg">
          {/* HUD row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white">
                {level.level}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800">{level.title}</p>
                <p className="text-xs text-slate-400">{profile.xp.toLocaleString()} XP</p>
              </div>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-bold ${
              (profile.current_streak || 0) > 0
                ? 'bg-orange-50 border-orange-200 text-orange-600'
                : 'bg-slate-100 border-slate-200 text-slate-400'
            }`}>
              <Flame className="w-4 h-4" /> {profile.current_streak || 0}
            </div>
          </div>

          {/* XP bar */}
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
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
                className="px-3 py-2.5 rounded-xl text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all"
              >
                {label}
              </Link>
            ))}
            <Link
              href="/settings"
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all"
            >
              Settings
              {!profile.has_api_key && (
                <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Key missing</span>
              )}
            </Link>
            <button
              onClick={() => { signOut(); setMenuOpen(false) }}
              className="text-left px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-all"
            >
              Sign Out
            </button>
          </nav>
        </div>
      )}
    </header>
  )
}
