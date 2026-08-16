'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import type { CodingTask } from '@/data/curriculum'
import { CheckCircle, XCircle, Lightbulb, Eye, Send, RotateCcw, Loader2 } from 'lucide-react'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

type Feedback = {
  score: number
  passed: boolean
  feedback: {
    correct: string[]
    improvements: string[]
    hint: string
  }
}

type Props = {
  task: CodingTask
  topicId: string
  topicTitle: string
  isCompleted: boolean
  onComplete: (score: number) => Promise<void>
}

export default function CodeEditor({ task, topicId, topicTitle, isCompleted, onComplete }: Props) {
  const [code, setCode] = useState(task.boilerplate)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [showSolution, setShowSolution] = useState(false)
  const [attempts, setAttempts] = useState(0)

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
        }),
      })

      const data = await response.json()
      setFeedback(data)
      setAttempts(prev => prev + 1)

      if (data.passed) {
        await onComplete(data.score)
      }
    } catch {
      setFeedback({
        score: 0,
        passed: false,
        feedback: {
          correct: [],
          improvements: ['Failed to connect to review service. Please try again.'],
          hint: 'Check your internet connection and try again.',
        },
      })
    }

    setSubmitting(false)
  }, [code, topicId, topicTitle, task, onComplete])

  const handleShowHint = () => {
    if (hintsUsed < task.hints.length) {
      setHintsUsed(prev => prev + 1)
    }
  }

  const handleReset = () => {
    setCode(task.boilerplate)
    setFeedback(null)
  }

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="font-semibold text-white mb-3">Instructions</h3>
        <div className="text-sm text-gray-300 whitespace-pre-line leading-relaxed">{task.instructions}</div>

        {task.rubric.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-800">
            <h4 className="text-sm font-medium text-gray-400 mb-2">Rubric</h4>
            <ul className="space-y-1">
              {task.rubric.map((item, i) => (
                <li key={i} className="text-sm text-gray-500 flex items-start gap-2">
                  <span className="text-gray-600 mt-0.5">&#x2022;</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Editor */}
      <div className="border border-gray-800 rounded-xl overflow-hidden">
        <div className="bg-gray-900 border-b border-gray-800 px-4 py-2 flex items-center justify-between">
          <span className="text-sm text-gray-400">solution.py</span>
          <button
            onClick={handleReset}
            className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        </div>
        <MonacoEditor
          height="400px"
          defaultLanguage="python"
          theme="vs-dark"
          value={code}
          onChange={(value) => setCode(value || '')}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            tabSize: 4,
            padding: { top: 12 },
          }}
        />
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleSubmit}
          disabled={submitting || !code.trim()}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium px-6 py-2.5 rounded-xl transition-colors"
        >
          {submitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Reviewing...</>
          ) : (
            <><Send className="w-4 h-4" /> Submit for Review</>
          )}
        </button>

        {hintsUsed < task.hints.length && (
          <button
            onClick={handleShowHint}
            className="flex items-center gap-2 bg-amber-900/30 hover:bg-amber-900/50 text-amber-400 px-4 py-2.5 rounded-xl border border-amber-800/30 transition-colors text-sm"
          >
            <Lightbulb className="w-4 h-4" />
            Hint ({hintsUsed}/{task.hints.length})
          </button>
        )}

        {attempts >= 3 && !showSolution && (
          <button
            onClick={() => setShowSolution(true)}
            className="flex items-center gap-2 text-gray-400 hover:text-gray-200 px-4 py-2.5 text-sm"
          >
            <Eye className="w-4 h-4" />
            Show Solution
          </button>
        )}
      </div>

      {/* Hints */}
      {hintsUsed > 0 && (
        <div className="space-y-2">
          {task.hints.slice(0, hintsUsed).map((hint, i) => (
            <div key={i} className="bg-amber-900/10 border border-amber-800/20 rounded-lg p-4 text-sm">
              <span className="text-amber-400 font-medium">Hint {i + 1}:</span>
              <span className="text-amber-200/70 ml-2">{hint}</span>
            </div>
          ))}
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <div className={`border rounded-xl p-5 space-y-4 ${
          feedback.passed
            ? 'bg-emerald-900/10 border-emerald-700/40'
            : 'bg-gray-900 border-gray-800'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {feedback.passed ? (
                <CheckCircle className="w-6 h-6 text-emerald-400" />
              ) : (
                <XCircle className="w-6 h-6 text-red-400" />
              )}
              <div>
                <p className={`font-semibold ${feedback.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                  {feedback.passed ? 'Passed!' : 'Not quite yet'}
                </p>
                <p className="text-sm text-gray-400">Score: {feedback.score}%{!feedback.passed && ' — Need 70% to pass'}</p>
              </div>
            </div>
          </div>

          {feedback.feedback.correct.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-emerald-400 mb-2">What you got right:</h4>
              <ul className="space-y-1">
                {feedback.feedback.correct.map((item, i) => (
                  <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {feedback.feedback.improvements.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-amber-400 mb-2">To improve:</h4>
              <ul className="space-y-1">
                {feedback.feedback.improvements.map((item, i) => (
                  <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5 shrink-0">&#x2022;</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!feedback.passed && feedback.feedback.hint && (
            <div className="bg-gray-800/50 rounded-lg p-3 text-sm text-gray-400">
              <span className="text-amber-400 font-medium">Tip:</span> {feedback.feedback.hint}
            </div>
          )}
        </div>
      )}

      {/* Solution */}
      {showSolution && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="bg-gray-800 px-4 py-2 flex items-center gap-2">
            <Eye className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-400">Solution</span>
          </div>
          <pre className="p-4 text-sm text-gray-300 overflow-x-auto">
            <code>{task.solutionCode}</code>
          </pre>
        </div>
      )}
    </div>
  )
}
