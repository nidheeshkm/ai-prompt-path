'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { getLevelForXp, getXpProgress, getNextLevel } from '@/lib/gamification'
import { Flame, Trophy, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'

export default function Header() {
  const { user, profile, signOut, loading } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const level = profile ? getLevelForXp(profile.xp) : { level: 1, title: 'Novice' }
  const progress = profile ? getXpProgress(profile.xp) : { current: 0, needed: 300, percentage: 0 }
  const nextLevel = profile ? getNextLevel(profile.xp) : null

  if (loading) {
    return (
      <header className="bg-gray-900 border-b border-gray-800 h-16" />
    )
  }

  return (
    <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-2 shrink-0">
          <span className="text-2xl">🦜</span>
          <span className="text-lg font-bold text-white hidden sm:inline">LangChain Academy</span>
        </Link>

        {user && profile ? (
          <>
            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-6">
              <Link href="/dashboard" className="text-gray-300 hover:text-white text-sm font-medium transition-colors">
                Dashboard
              </Link>
              <Link href="/learn/1" className="text-gray-300 hover:text-white text-sm font-medium transition-colors">
                Course
              </Link>

              {/* Streak */}
              <div className="flex items-center gap-1.5 text-sm">
                <Flame className={`w-4 h-4 ${(profile.current_streak || 0) > 0 ? 'text-orange-400' : 'text-gray-600'}`} />
                <span className={`font-medium ${(profile.current_streak || 0) > 0 ? 'text-orange-400' : 'text-gray-500'}`}>
                  {profile.current_streak || 0}
                </span>
              </div>

              {/* Level & XP bar */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                    Lv.{level.level}
                  </span>
                  <span className="text-xs text-gray-400">{level.title}</span>
                </div>
                <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500">
                  {profile.xp} XP
                  {nextLevel && ` / ${nextLevel.xpRequired}`}
                </span>
              </div>

              {/* User */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-300">{profile.display_name}</span>
                <button onClick={signOut} className="text-gray-500 hover:text-gray-300 transition-colors">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Mobile menu button */}
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-gray-300">
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-gray-300 hover:text-white text-sm font-medium">
              Sign In
            </Link>
            <Link href="/auth/signup" className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              Get Started
            </Link>
          </div>
        )}
      </div>

      {/* Mobile dropdown */}
      {menuOpen && user && profile && (
        <div className="md:hidden bg-gray-900 border-t border-gray-800 px-4 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                Lv.{level.level} {level.title}
              </span>
              <Flame className={`w-4 h-4 ${(profile.current_streak || 0) > 0 ? 'text-orange-400' : 'text-gray-600'}`} />
              <span className="text-sm text-orange-400">{profile.current_streak || 0}</span>
            </div>
            <span className="text-sm text-gray-400">{profile.xp} XP</span>
          </div>
          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <nav className="flex flex-col gap-2">
            <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="text-gray-300 hover:text-white py-2">Dashboard</Link>
            <Link href="/learn/1" onClick={() => setMenuOpen(false)} className="text-gray-300 hover:text-white py-2">Course</Link>
            <button onClick={() => { signOut(); setMenuOpen(false) }} className="text-left text-gray-400 hover:text-red-400 py-2">Sign Out</button>
          </nav>
        </div>
      )}
    </header>
  )
}
