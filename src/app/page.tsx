'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { curriculum, getAllTopics, getTotalXP } from '@/data/curriculum'
import { BookOpen, Code, Trophy, Zap, ChevronRight, Shield, Brain, GitBranch } from 'lucide-react'

export default function LandingPage() {
  const { user } = useAuth()

  const totalTopics = getAllTopics().length
  const totalXP = getTotalXP()
  const totalChapters = curriculum.length

  return (
    <main className="flex-1 overflow-y-auto">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/20 via-transparent to-transparent" />
        <div className="max-w-5xl mx-auto px-4 py-20 md:py-32 text-center relative">
          <div className="inline-flex items-center gap-2 bg-emerald-900/30 border border-emerald-700/30 rounded-full px-4 py-1.5 text-sm text-emerald-400 mb-6">
            <Zap className="w-4 h-4" />
            {totalChapters} Chapters &middot; {totalTopics} Topics &middot; {totalXP.toLocaleString()} XP
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight mb-6">
            Master LangChain<br />
            <span className="text-emerald-400">From Zero to Hero</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            The most comprehensive hands-on course covering LangChain, LangGraph, RAG, Agents,
            Multi-Agent Systems, and production deployment. Learn by doing — every topic
            includes quizzes or coding challenges reviewed by AI.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {user ? (
              <Link
                href="/dashboard"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors text-lg flex items-center gap-2"
              >
                Go to Dashboard <ChevronRight className="w-5 h-5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/signup"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors text-lg"
                >
                  Start Learning Free
                </Link>
                <Link
                  href="/auth/login"
                  className="border border-gray-700 hover:border-gray-600 text-gray-300 font-medium px-8 py-3.5 rounded-xl transition-colors"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-6">
          <FeatureCard
            icon={<BookOpen className="w-6 h-6 text-blue-400" />}
            title="Expert-Level Content"
            description="From basic LLM calls to multi-agent systems, production RAG, and LangGraph. Every topic taught with industrial depth."
          />
          <FeatureCard
            icon={<Code className="w-6 h-6 text-purple-400" />}
            title="AI Code Review"
            description="Write real Python code in our Monaco editor. Submit for instant AI-powered review with specific, actionable feedback."
          />
          <FeatureCard
            icon={<Trophy className="w-6 h-6 text-yellow-400" />}
            title="Gamified Learning"
            description="Earn XP, level up from Novice to LangChain Hero, maintain streaks, and unlock badges as you master each chapter."
          />
        </div>
      </section>

      {/* Curriculum overview */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-white text-center mb-4">
          What You&apos;ll Learn
        </h2>
        <p className="text-gray-400 text-center mb-12 max-w-xl mx-auto">
          A carefully sequenced curriculum that builds on itself. Every topic is gated —
          you prove mastery before moving forward.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          {curriculum.map((chapter) => (
            <div key={chapter.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{chapter.icon}</span>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{chapter.part}</p>
                  <h3 className="font-semibold text-white">
                    Ch.{chapter.id}: {chapter.title}
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">{chapter.description}</p>
                  <p className="text-xs text-gray-600 mt-2">{chapter.topics.length} topics</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Key topics highlights */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-6">
          <HighlightCard
            icon={<GitBranch className="w-8 h-8 text-emerald-400" />}
            title="LangGraph Deep Dive"
            items={['State machines & conditional routing', 'Human-in-the-loop patterns', 'Multi-agent orchestration', 'Persistence & checkpointing']}
          />
          <HighlightCard
            icon={<Brain className="w-8 h-8 text-purple-400" />}
            title="Advanced RAG"
            items={['Self-RAG & Corrective RAG', 'Adaptive & Graph RAG', 'Agentic retrieval loops', 'Evaluation frameworks']}
          />
          <HighlightCard
            icon={<Shield className="w-8 h-8 text-blue-400" />}
            title="Production Ready"
            items={['Prompt injection defense', 'Input/output guardrails', 'Testing & monitoring', 'Deployment patterns']}
          />
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Ready to become a LangChain Hero?</h2>
        <p className="text-gray-400 mb-8">Join and start your journey through {totalTopics} hands-on topics.</p>
        {!user && (
          <Link
            href="/auth/signup"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors text-lg inline-flex items-center gap-2"
          >
            Start Learning Now <ChevronRight className="w-5 h-5" />
          </Link>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 text-center text-sm text-gray-600">
        <p>PromptPath &mdash; A hands-on learning platform for the LangChain ecosystem</p>
      </footer>
    </main>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="mb-4">{icon}</div>
      <h3 className="font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
    </div>
  )
}

function HighlightCard({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="mb-4">{icon}</div>
      <h3 className="font-semibold text-white mb-3">{title}</h3>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-gray-400 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
