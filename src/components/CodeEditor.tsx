'use client'

import { useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import type { CodingTask } from '@/data/curriculum'
import type { CodingSubmission } from '@/lib/supabase'
import { getReviewMode, type ReviewMode } from '@/lib/review-modes'
import {
  CheckCircle, XCircle, Lightbulb, Eye, Send, RotateCcw,
  Loader2, Copy, Check, Maximize2, Minimize2, AlignJustify, Key,
  BookOpen, AlertCircle, Sparkles, ArrowRight,
} from 'lucide-react'
import Link from 'next/link'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

type WalkthroughStep = { step: number; title: string; explanation: string }
type MissingItem = { what: string; why_it_matters: string; how_to_fix: string }

type Feedback = {
  score: number
  passed: boolean
  feedback: {
    correct: string[]
    improvements: string[]
    hint: string
    walkthrough: WalkthroughStep[] | null
    concept_note: string | null
    missing: MissingItem[] | null
    relearn: string[] | null
  }
}

type Props = {
  task: CodingTask
  topicId: string
  topicTitle: string
  isCompleted: boolean
  bestScore?: number
  storedSubmission?: CodingSubmission | null
  onComplete: (score: number, submission: CodingSubmission) => Promise<void>
  language?: 'python' | 'yaml' | 'bash' | 'typescript' | 'javascript'
  hasKey?: boolean
}

const LANGUAGE_META: Record<string, { label: string; filename: string; monacoLang: string }> = {
  python:     { label: 'Python',     filename: 'solution.py',   monacoLang: 'python' },
  yaml:       { label: 'YAML',       filename: 'manifest.yaml', monacoLang: 'yaml' },
  bash:       { label: 'Bash',       filename: 'script.sh',     monacoLang: 'shell' },
  typescript: { label: 'TypeScript', filename: 'solution.ts',   monacoLang: 'typescript' },
  javascript: { label: 'JavaScript', filename: 'solution.js',   monacoLang: 'javascript' },
}

const HEIGHTS = [300, 400, 600] as const
type HeightIdx = 0 | 1 | 2

// Map rubric item text against AI feedback.correct to determine pass/fail
function matchRubricItem(item: string, correct: string[], improvements: string[]): 'pass' | 'fail' | 'pending' {
  const lower = item.toLowerCase()
  const inCorrect = correct.some(c => {
    const cl = c.toLowerCase()
    // rough substring overlap
    const words = lower.split(/\s+/).filter(w => w.length > 4)
    return words.some(w => cl.includes(w))
  })
  const inFail = improvements.some(c => {
    const cl = c.toLowerCase()
    const words = lower.split(/\s+/).filter(w => w.length > 4)
    return words.some(w => cl.includes(w))
  })
  if (inCorrect) return 'pass'
  if (inFail) return 'fail'
  return 'pending'
}

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 transition-colors"
      title="Copy code"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

export default function CodeEditor({ task, topicId, topicTitle, isCompleted, bestScore = 0, storedSubmission, onComplete, language = 'python', hasKey }: Props) {
  const [code, setCode] = useState(storedSubmission?.code ?? task.boilerplate)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [reviewMode, setReviewModeState] = useState<ReviewMode>('deep_dive')

  useEffect(() => { setReviewModeState(getReviewMode()) }, [])
  const [hintsUsed, setHintsUsed] = useState(0)
  const [showSolution, setShowSolution] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [heightIdx, setHeightIdx] = useState<HeightIdx>(1)

  const langMeta = LANGUAGE_META[language] ?? LANGUAGE_META.python
  const height = HEIGHTS[heightIdx]

  // Gate: no key configured
  if (!hasKey) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
          <Key className="w-6 h-6 text-amber-500" />
        </div>
        <div>
          <h3 className="text-slate-900 font-semibold mb-1">AI provider key required</h3>
          <p className="text-sm text-slate-500 max-w-xs">
            Code reviews are AI-powered. Add a free OpenRouter or Groq key in Settings to unlock assessments.
          </p>
        </div>
        <Link
          href="/settings"
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
        >
          Go to Settings
        </Link>
      </div>
    )
  }

  const handleSubmit = useCallback(async () => {
    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          topicId,
          topicTitle,
          rubric: task.rubric,
          instructions: task.instructions,
          reviewMode,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        const errorFeedback = (msg: string, hint: string) => ({
          score: 0, passed: false,
          feedback: { correct: [], improvements: [msg], hint, walkthrough: null, concept_note: null, missing: null, relearn: null },
        })
        if (data.error === 'quota_exceeded') {
          setFeedback(errorFeedback(
            `Your ${data.provider || 'AI'} quota is exhausted. The review could not be completed.`,
            'Add a different provider key in Settings, or wait for your quota to reset.',
          ))
        } else if (data.error === 'invalid_key') {
          setFeedback(errorFeedback(
            'Your API key was rejected. It may be invalid or expired.',
            'Go to Settings and update your API key.',
          ))
        } else if (data.error === 'no_key') {
          setFeedback(errorFeedback(
            'No AI provider key is configured.',
            'Add a free OpenRouter or Groq key in Settings to unlock code reviews.',
          ))
        } else {
          setFeedback(errorFeedback(
            'The review service returned an unexpected error. Please try again.',
            '',
          ))
        }
        setSubmitting(false)
        return
      }

      setFeedback(data)
      setAttempts(prev => prev + 1)
      if (data.passed) await onComplete(data.score, { type: 'coding', code })
    } catch {
      setFeedback({
        score: 0,
        passed: false,
        feedback: {
          correct: [],
          improvements: ['Failed to connect to review service. Please try again.'],
          hint: 'Check your internet connection and try again.',
          walkthrough: null,
          concept_note: null,
          missing: null,
          relearn: null,
        },
      })
    }
    setSubmitting(false)
  }, [code, topicId, topicTitle, task, onComplete])

  const handleShowHint = () => {
    if (hintsUsed < task.hints.length) setHintsUsed(prev => prev + 1)
  }

  const handleReset = () => {
    setCode(task.boilerplate)
    setFeedback(null)
  }

  const cycleHeight = () => setHeightIdx(prev => ((prev + 1) % HEIGHTS.length) as HeightIdx)

  const heightIcon = heightIdx === 0 ? <Maximize2 className="w-3.5 h-3.5" />
    : heightIdx === 2 ? <Minimize2 className="w-3.5 h-3.5" />
    : <AlignJustify className="w-3.5 h-3.5" />

  return (
    <div className="space-y-5">
      {/* Completion banner */}
      {isCompleted && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4 flex items-center gap-4">
          <CheckCircle className="w-6 h-6 text-emerald-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-emerald-800 text-sm">Challenge completed</p>
            {bestScore > 0 && (
              <p className="text-xs text-emerald-600 mt-0.5">Best score: <span className="font-bold">{bestScore}%</span></p>
            )}
          </div>
          <span className="text-xs text-emerald-600 bg-white border border-emerald-200 px-3 py-1 rounded-full font-medium">
            Resubmit to improve score
          </span>
        </div>
      )}

      {/* Instructions + Rubric checklist */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h3 className="font-semibold text-slate-900 mb-3">Instructions</h3>
        <div className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">{task.instructions}</div>

        {task.rubric.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <h4 className="text-sm font-medium text-slate-500 mb-2.5">Checklist</h4>
            <ul className="space-y-2">
              {task.rubric.map((item, i) => {
                const status = feedback
                  ? matchRubricItem(item, feedback.feedback.correct, feedback.feedback.improvements)
                  : 'pending'
                return (
                  <li key={i} className={`flex items-start gap-2.5 text-sm transition-colors duration-300 ${
                    status === 'pass' ? 'text-emerald-700' :
                    status === 'fail' ? 'text-red-600' :
                    'text-slate-400'
                  }`}>
                    <span className="mt-0.5 shrink-0">
                      {status === 'pass'
                        ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                        : status === 'fail'
                        ? <XCircle className="w-4 h-4 text-red-500" />
                        : <span className="block w-4 h-4 rounded-full border border-slate-200 mt-0.5" />}
                    </span>
                    {item}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Editor */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded bg-slate-200 text-slate-600 font-mono">
              {langMeta.label}
            </span>
            <span className="text-sm text-slate-500">{langMeta.filename}</span>
          </div>
          <div className="flex items-center gap-3">
            <CopyButton code={code} />
            <button
              onClick={cycleHeight}
              className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1 transition-colors"
              title="Toggle editor height"
            >
              {heightIcon}
            </button>
            <button
              onClick={handleReset}
              className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>
        </div>
        <MonacoEditor
          height={`${height}px`}
          language={langMeta.monacoLang}
          theme="vs-dark"
          value={code}
          onChange={(value) => setCode(value || '')}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            tabSize: language === 'yaml' ? 2 : 4,
            padding: { top: 12 },
          }}
        />
      </div>

      {/* Active review mode badge */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Sparkles className="w-3.5 h-3.5" />
        <span>
          Review mode: <span className="font-medium text-slate-600">
            {reviewMode === 'quick' ? 'Quick Check' : reviewMode === 'standard' ? 'Standard Review' : 'Deep Dive'}
          </span>
        </span>
        <Link href="/settings" className="text-emerald-600 hover:underline">Change in Settings</Link>
      </div>

      {/* Attempt counter + action buttons */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleSubmit}
          disabled={submitting || !code.trim()}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium px-6 py-2.5 rounded-xl transition-colors"
        >
          {submitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Reviewing…</>
          ) : (
            <><Send className="w-4 h-4" /> Submit for Review</>
          )}
        </button>

        {hintsUsed < task.hints.length && (
          <button
            onClick={handleShowHint}
            className="flex items-center gap-2 bg-amber-50 hover:bg-amber-100 text-amber-700 px-4 py-2.5 rounded-xl border border-amber-200 transition-colors text-sm"
          >
            <Lightbulb className="w-4 h-4" />
            Hint {hintsUsed}/{task.hints.length}
          </button>
        )}

        {attempts >= 3 && !showSolution && (
          <button
            onClick={() => setShowSolution(true)}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-700 px-4 py-2.5 text-sm transition-colors"
          >
            <Eye className="w-4 h-4" /> Show Solution
          </button>
        )}

        {/* Attempt pill */}
        {attempts > 0 && (
          <span className="ml-auto text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
            Attempt {attempts}{attempts < 3 ? ` · ${3 - attempts} left before solution unlocks` : ''}
          </span>
        )}
      </div>

      {/* Hints */}
      {hintsUsed > 0 && (
        <div className="space-y-2">
          {task.hints.slice(0, hintsUsed).map((hint, i) => (
            <div key={i} className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm flex gap-3">
              <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="text-amber-700 font-medium">Hint {i + 1}:</span>
                <span className="text-amber-800 ml-2">{hint}</span>
              </div>
            </div>
          ))}
          {hintsUsed < task.hints.length && (
            <p className="text-xs text-slate-400 pl-1">{task.hints.length - hintsUsed} more hint{task.hints.length - hintsUsed > 1 ? 's' : ''} available</p>
          )}
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <div className="space-y-4">

          {/* Score header */}
          <div className={`border rounded-xl p-4 flex items-center gap-4 ${
            feedback.passed ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
          }`}>
            {feedback.passed
              ? <CheckCircle className="w-7 h-7 text-emerald-500 shrink-0" />
              : <XCircle className="w-7 h-7 text-red-500 shrink-0" />}
            <div className="flex-1">
              <p className={`font-bold text-base ${feedback.passed ? 'text-emerald-700' : 'text-red-700'}`}>
                {feedback.passed ? 'Great work — code passed!' : 'Not quite there yet'}
              </p>
              <p className="text-sm text-slate-500 mt-0.5">
                Score: <span className="font-semibold text-slate-700">{feedback.score}%</span>
                {!feedback.passed && ' · Need 70% to pass'}
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="w-20 h-2 bg-white/70 rounded-full overflow-hidden mt-1">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${feedback.passed ? 'bg-emerald-500' : 'bg-red-400'}`}
                  style={{ width: `${feedback.score}%` }}
                />
              </div>
            </div>
          </div>

          {/* PASS PATH: Step-by-step walkthrough */}
          {feedback.passed && feedback.feedback.walkthrough && feedback.feedback.walkthrough.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-semibold text-slate-800">How your code works — step by step</span>
              </div>
              <div className="divide-y divide-slate-100">
                {feedback.feedback.walkthrough.map((step, i) => (
                  <div key={i} className="flex gap-4 p-4">
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <div className="w-7 h-7 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-xs font-bold text-emerald-700">
                        {step.step}
                      </div>
                      {i < feedback.feedback.walkthrough!.length - 1 && (
                        <div className="w-px flex-1 bg-slate-200 min-h-[12px]" />
                      )}
                    </div>
                    <div className="flex-1 pb-1">
                      <p className="text-sm font-semibold text-slate-900 mb-1">{step.title}</p>
                      <p className="text-sm text-slate-600 leading-relaxed">{step.explanation}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PASS PATH: Concept note */}
          {feedback.passed && feedback.feedback.concept_note && (
            <div className="border border-blue-200 bg-blue-50 rounded-xl p-4 flex gap-3">
              <Sparkles className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Under the hood</p>
                <p className="text-sm text-blue-900 leading-relaxed">{feedback.feedback.concept_note}</p>
              </div>
            </div>
          )}

          {/* PASS PATH: Minor improvements */}
          {feedback.passed && feedback.feedback.improvements.length > 0 && (
            <div className="border border-slate-200 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Polish suggestions</h4>
              <ul className="space-y-1.5">
                {feedback.feedback.improvements.map((item, i) => (
                  <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* FAIL PATH: What you got right */}
          {!feedback.passed && feedback.feedback.correct.length > 0 && (
            <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">What you got right</h4>
              <ul className="space-y-1.5">
                {feedback.feedback.correct.map((item, i) => (
                  <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* FAIL PATH: What's missing */}
          {!feedback.passed && feedback.feedback.missing && feedback.feedback.missing.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm font-semibold text-slate-800">What needs fixing</span>
              </div>
              <div className="divide-y divide-slate-100">
                {feedback.feedback.missing.map((item, i) => (
                  <div key={i} className="p-4 space-y-2">
                    <p className="text-sm font-semibold text-red-700">{item.what}</p>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      <span className="font-medium text-slate-700">Why it matters: </span>
                      {item.why_it_matters}
                    </p>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <p className="text-xs font-semibold text-amber-700 mb-0.5">How to fix it</p>
                      <p className="text-sm text-amber-900 leading-relaxed">{item.how_to_fix}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FAIL PATH: Topics to relearn */}
          {!feedback.passed && feedback.feedback.relearn && feedback.feedback.relearn.length > 0 && (
            <div className="border border-blue-200 bg-blue-50 rounded-xl p-4 flex gap-3">
              <BookOpen className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Revisit these concepts</p>
                <div className="flex flex-wrap gap-2">
                  {feedback.feedback.relearn.map((topic, i) => (
                    <span key={i} className="text-xs font-medium text-blue-800 bg-white border border-blue-200 px-2.5 py-1 rounded-full">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Solution */}
      {showSolution && (
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-500">Reference Solution</span>
            </div>
            <CopyButton code={task.solutionCode} />
          </div>
          <pre className="p-4 text-sm overflow-x-auto bg-slate-900 text-slate-200">
            <code>{task.solutionCode}</code>
          </pre>
        </div>
      )}
    </div>
  )
}
