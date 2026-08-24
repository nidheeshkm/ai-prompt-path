'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import {
  BookOpen,
  Code,
  Trophy,
  Zap,
  ChevronRight,
  Lock,
  Star,
  Shield,
  CheckCircle,
  ArrowRight,
  Layers,
  ClipboardCheck,
} from 'lucide-react'

export default function LandingPage() {
  const { user } = useAuth()

  return (
    <main className="flex-1 overflow-y-auto bg-white">

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-emerald-50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-100/40 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto px-4 py-20 md:py-32 text-center relative">

          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-4 py-1.5 text-sm text-emerald-700 font-medium mb-6">
            <Zap className="w-4 h-4" />
            AI-graded assessments &middot; Real coding challenges &middot; Mastery-gated progress
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-slate-900 leading-tight mb-6">
            Your IT skills,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-cyan-500">
              proven by practice
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            PromptPath is a multi-discipline learning platform for developers. Study web development,
            Python, AI&nbsp;&amp;&nbsp;ML, DevOps, databases, and more — then prove what you know
            through quizzes, coding challenges, and mini-projects reviewed by AI with real,
            specific feedback.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {user ? (
              <Link
                href="/dashboard"
                className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold px-8 py-3.5 rounded-xl transition-all shadow-md shadow-emerald-500/20 text-lg flex items-center gap-2"
              >
                Go to Dashboard <ChevronRight className="w-5 h-5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/signup"
                  className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold px-8 py-3.5 rounded-xl transition-all shadow-md shadow-emerald-500/20 text-lg"
                >
                  Start Learning Free
                </Link>
                <Link
                  href="/auth/login"
                  className="border border-slate-300 hover:border-slate-400 text-slate-700 hover:text-slate-900 font-medium px-8 py-3.5 rounded-xl transition-colors"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>

          {/* Social proof strip */}
          <div className="mt-14 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" /> AI-graded feedback
            </span>
            <span className="w-px h-4 bg-slate-200 hidden sm:block" />
            <span className="flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-emerald-500" /> Mastery-gated progress
            </span>
            <span className="w-px h-4 bg-slate-200 hidden sm:block" />
            <span className="flex items-center gap-1.5">
              <Code className="w-4 h-4 text-cyan-500" /> Real coding challenges
            </span>
            <span className="w-px h-4 bg-slate-200 hidden sm:block" />
            <span className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-slate-400" /> Bring your own AI key
            </span>
          </div>
        </div>
      </section>

      {/* ── Feature cards ──────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Built to make skills stick</h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            Every design decision on PromptPath pushes you to actually learn — not just watch videos and move on.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <FeatureCard
            icon={<Lock className="w-6 h-6 text-emerald-600" />}
            iconBg="bg-emerald-50"
            title="You can't skip ahead"
            description="Progress is gated by mastery, not time. You must pass each assessment before unlocking the next topic — so your knowledge is always solid before it builds further."
          />
          <FeatureCard
            icon={<Code className="w-6 h-6 text-purple-600" />}
            iconBg="bg-purple-50"
            title="AI code review — not just pass/fail"
            description="Write real code and get instant, specific feedback from AI. It explains what's wrong, why it matters, and how to fix it — the same quality as a senior engineer's review."
          />
          <FeatureCard
            icon={<Trophy className="w-6 h-6 text-amber-600" />}
            iconBg="bg-amber-50"
            title="Gamified motivation that lasts"
            description="Earn XP, level up, maintain streaks, and unlock badges as you complete topics and challenges. Progress feels tangible at every step."
          />
          <FeatureCard
            icon={<Layers className="w-6 h-6 text-cyan-600" />}
            iconBg="bg-cyan-50"
            title="Mini-projects and real assignments"
            description="Courses include mini-projects and full assignments — not just multiple-choice quizzes. You build things, then get AI feedback on what you built."
          />
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────── */}
      <section className="bg-slate-50 border-y border-slate-100 py-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Learn &rarr; Practice &rarr; Advance</h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              Every topic follows the same proven flow. No shortcuts, no passive reading — you earn every step forward.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              step="01"
              icon={<BookOpen className="w-7 h-7 text-blue-600" />}
              iconBg="bg-blue-50"
              title="Learn the concept"
              description="Each topic opens with a focused lesson — clear explanations with examples, written to build on everything you've already mastered."
            />
            <StepCard
              step="02"
              icon={<ClipboardCheck className="w-7 h-7 text-purple-600" />}
              iconBg="bg-purple-50"
              title="Prove you've got it"
              description="Then comes an assessment — a quiz, a coding challenge, or a mini-project. You must pass before moving on. AI grades your work and gives you specific feedback."
            />
            <StepCard
              step="03"
              icon={<ArrowRight className="w-7 h-7 text-emerald-600" />}
              iconBg="bg-emerald-50"
              title="Unlock the next topic"
              description="Pass, and the next topic unlocks. Your progress is a record of real competence — not just completion clicks. Keep your streak alive and watch your XP grow."
            />
          </div>
        </div>
      </section>

      {/* ── Bring your own key ────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 py-20 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-6">
            <Shield className="w-7 h-7 text-slate-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">No platform lock-in</h2>
          <p className="text-slate-500 mb-8 max-w-lg mx-auto leading-relaxed">
            AI grading runs on your own API key — not ours. Bring a key from any major AI
            provider and the platform uses it to review your work. You stay in control
            of costs and keep your data private.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              'AI-graded quizzes',
              'AI code review',
              'AI project feedback',
              'Your key, your cost',
            ].map((label) => (
              <span
                key={label}
                className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-full px-4 py-2 text-sm font-medium text-slate-600"
              >
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-emerald-500 to-cyan-600 py-20 text-center">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to learn the right way?
          </h2>
          <p className="text-emerald-100 mb-8 leading-relaxed">
            Join PromptPath and build IT skills that hold up under pressure — through structured
            lessons, real assessments, and AI feedback that actually teaches.
          </p>
          {!user && (
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 bg-white text-emerald-700 hover:bg-emerald-50 font-bold px-8 py-3.5 rounded-xl transition-colors text-lg shadow-lg"
            >
              Get Started Free <ChevronRight className="w-5 h-5" />
            </Link>
          )}
          {user && (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 bg-white text-emerald-700 hover:bg-emerald-50 font-bold px-8 py-3.5 rounded-xl transition-colors text-lg shadow-lg"
            >
              Go to Dashboard <ChevronRight className="w-5 h-5" />
            </Link>
          )}
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-slate-100 py-8 text-center text-sm text-slate-400 bg-white">
        <p>PromptPath &mdash; Learn. Practice. Advance.</p>
      </footer>
    </main>
  )
}

/* ── Helper components ─────────────────────────────────────────── */

function FeatureCard({
  icon,
  iconBg,
  title,
  description,
}: {
  icon: React.ReactNode
  iconBg: string
  title: string
  description: string
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
    </div>
  )
}

function StepCard({
  step,
  icon,
  iconBg,
  title,
  description,
}: {
  step: string
  icon: React.ReactNode
  iconBg: string
  title: string
  description: string
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
          {icon}
        </div>
        <span className="text-3xl font-black text-slate-100 select-none leading-none">{step}</span>
      </div>
      <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
    </div>
  )
}

function HighlightCard({
  icon,
  iconBg,
  title,
  items,
}: {
  icon: React.ReactNode
  iconBg: string
  title: string
  items: string[]
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <h3 className="font-semibold text-slate-900 mb-3">{title}</h3>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-slate-500 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
