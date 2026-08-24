import { Zap, Lock, Code2, Trophy, Flame, CheckCircle, Star } from 'lucide-react'
import Link from 'next/link'

export default function AuthSidePanel() {
  return (
    <div className="hidden lg:flex flex-col min-h-screen bg-gradient-to-br from-emerald-600 via-emerald-500 to-cyan-500 p-10 relative overflow-hidden">

      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-80px] right-[-80px] w-[360px] h-[360px] rounded-full bg-white/5" />
        <div className="absolute bottom-[-60px] left-[-60px] w-[280px] h-[280px] rounded-full bg-white/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-white/[0.03]" />
      </div>

      {/* Logo */}
      <Link href="/" className="relative flex items-center gap-2.5 w-fit">
        <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <span className="text-white font-bold text-lg tracking-tight">PromptPath</span>
      </Link>

      {/* Main pitch */}
      <div className="relative mt-16 flex-1">
        <p className="text-emerald-100 text-sm font-semibold uppercase tracking-widest mb-4">Why learners choose us</p>
        <h2 className="text-3xl font-bold text-white leading-snug mb-3">
          The platform that<br />won&apos;t let you fake it
        </h2>
        <p className="text-emerald-100 text-base leading-relaxed max-w-sm">
          No passive watching. No skipping ahead. Every skill earned through structured lessons, real code, and AI-graded assessments.
        </p>

        {/* Feature pills */}
        <div className="mt-10 space-y-3">
          {[
            { icon: Lock,    label: "Mastery-gated",     desc: "Complete each topic before moving forward" },
            { icon: Code2,   label: "Real code review",  desc: "AI gives specific feedback, not just pass/fail" },
            { icon: Trophy,  label: "XP, levels & streaks", desc: "Progress that feels tangible every session" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-3 bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Icon className="w-4.5 h-4.5 text-white" strokeWidth={2} />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{label}</p>
                <p className="text-emerald-100 text-xs mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Simulated learner progress card */}
      <div className="relative mt-10">
        <p className="text-emerald-200 text-xs font-medium mb-3 uppercase tracking-widest">Learner spotlight</p>
        <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
              R
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-white font-semibold text-sm">Riya S.</p>
                <span className="text-xs bg-amber-400/20 text-amber-200 border border-amber-400/30 px-2 py-0.5 rounded-full font-medium">Lv 7</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <Flame className="w-3.5 h-3.5 text-orange-300" />
                <span className="text-emerald-200 text-xs">21-day streak</span>
                <span className="text-emerald-300/50 text-xs">·</span>
                <Star className="w-3 h-3 text-emerald-300" />
                <span className="text-emerald-200 text-xs">4,820 XP</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-100">Python for Automation</span>
              <span className="text-white font-medium">68%</span>
            </div>
            <div className="w-full bg-white/15 rounded-full h-1.5">
              <div className="bg-gradient-to-r from-emerald-300 to-cyan-300 h-1.5 rounded-full" style={{ width: '68%' }} />
            </div>
          </div>

          <div className="mt-3 flex items-center gap-1.5">
            {['✅', '✅', '✅', '✅', '🔓', '🔒', '🔒'].map((icon, i) => (
              <span key={i} className="text-sm">{icon}</span>
            ))}
            <span className="text-emerald-200 text-xs ml-1">Ch. 5 · Topic 5</span>
          </div>

          <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
            <p className="text-emerald-100 text-xs italic">&ldquo;Can&apos;t believe I actually understand decorators now.&rdquo;</p>
          </div>
        </div>
      </div>
    </div>
  )
}
