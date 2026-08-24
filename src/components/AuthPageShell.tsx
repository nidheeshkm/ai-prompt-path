'use client'

import Link from 'next/link'
import { Syne } from 'next/font/google'
import { DM_Sans } from 'next/font/google'
import { Zap, Lock, Trophy, Code2, CheckCircle } from 'lucide-react'
import type { ReactNode } from 'react'

const syne = Syne({ subsets: ['latin'], weight: ['700', '800'], display: 'swap', variable: '--font-syne' })
const dm   = DM_Sans({ subsets: ['latin'], weight: ['400', '500'], display: 'swap', variable: '--font-dm' })

type Props = {
  headline: string
  subtitle: string
  switchSlot: ReactNode
  children: ReactNode
}

const FEATURES = [
  { icon: Lock,   bg: 'bg-emerald-50', color: 'text-emerald-600', title: "Can't skip ahead",    desc: 'Pass each topic before unlocking the next' },
  { icon: Code2,  bg: 'bg-purple-50',  color: 'text-purple-600',  title: 'Real AI code review', desc: 'Specific feedback — not just pass or fail' },
  { icon: Trophy, bg: 'bg-amber-50',   color: 'text-amber-600',   title: 'XP, levels & streaks', desc: 'Progress that feels tangible every session' },
]

export default function AuthPageShell({ headline, subtitle, switchSlot, children }: Props) {
  return (
    <div
      className={`${syne.variable} ${dm.variable} min-h-screen relative overflow-x-hidden`}
      style={{ background: '#F7F9FB', fontFamily: 'var(--font-dm, system-ui, sans-serif)' }}
    >
      {/* Dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(100,116,139,0.09) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Ambient glows */}
      <div
        className="absolute top-0 right-0 pointer-events-none"
        style={{
          width: '700px', height: '700px',
          background: 'radial-gradient(ellipse at top right, rgba(16,185,129,0.10) 0%, transparent 60%)',
          transform: 'translate(25%, -25%)',
        }}
      />
      <div
        className="absolute bottom-0 left-0 pointer-events-none"
        style={{
          width: '500px', height: '500px',
          background: 'radial-gradient(ellipse at bottom left, rgba(6,182,212,0.07) 0%, transparent 60%)',
          transform: 'translate(-25%, 25%)',
        }}
      />

      {/* Main scrollable column */}
      <div className="relative z-10 flex flex-col items-center px-4 pb-16 pt-10 min-h-screen">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 mb-10 group">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg,#10B981 0%,#06B6D4 100%)', boxShadow: '0 4px 12px rgba(16,185,129,0.25)' }}>
            <Zap className="w-[18px] h-[18px] text-white" />
          </div>
          <span className="text-[17px] font-bold tracking-tight text-slate-900"
                style={{ fontFamily: 'var(--font-syne, system-ui)' }}>
            PromptPath
          </span>
        </Link>

        {/* Headline */}
        <div className="text-center max-w-[500px] mb-6">
          <div className="inline-flex items-center gap-1.5 mb-4 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.09em] border"
               style={{ color: '#10B981', borderColor: 'rgba(16,185,129,0.22)', background: 'rgba(16,185,129,0.06)' }}>
            Skill-based learning platform
          </div>
          <h1 className="font-extrabold text-slate-900 leading-[1.12] mb-3"
              style={{ fontFamily: 'var(--font-syne, system-ui)', fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', textWrap: 'balance' }}>
            {headline}
          </h1>
          <p className="text-[15px] text-slate-500 leading-relaxed max-w-[400px] mx-auto">
            {subtitle}
          </p>
        </div>

        {/* Proof chips */}
        <div className="flex flex-wrap gap-2 justify-center mb-7">
          {['AI-graded assessments', 'Mastery-gated progress', 'XP, levels & badges'].map(t => (
            <span key={t}
                  className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 bg-white border border-slate-200 rounded-full px-3 py-1"
                  style={{ boxShadow: '0 1px 3px rgba(15,25,35,0.06)' }}>
              <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
              {t}
            </span>
          ))}
        </div>

        {/* Form card */}
        <div className="w-full max-w-[420px] bg-white rounded-2xl p-8"
             style={{ boxShadow: '0 0 0 1px rgba(16,185,129,0.08), 0 24px 56px -8px rgba(15,25,35,0.13), 0 4px 16px -4px rgba(15,25,35,0.06)' }}>
          {children}
        </div>

        {/* Switch link */}
        <div className="mt-5 text-sm text-slate-500 text-center">{switchSlot}</div>

        {/* Feature strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-[580px] mt-12">
          {FEATURES.map(({ icon: Icon, bg, color, title, desc }) => (
            <div key={title} className={`bg-white border border-slate-100 rounded-xl p-4 flex flex-col gap-2.5`}
                 style={{ boxShadow: '0 1px 4px rgba(15,25,35,0.05)' }}>
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800">{title}</p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p className="mt-auto pt-12 text-[11px] text-slate-400">
          <span className="hover:text-slate-600 cursor-pointer transition-colors">Terms of Service</span>
          {' · '}
          <span className="hover:text-slate-600 cursor-pointer transition-colors">Privacy Policy</span>
        </p>
      </div>
    </div>
  )
}
