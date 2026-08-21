'use client'

import { useState } from 'react'
import type { QuizQuestion } from '@/data/curriculum'
import { CheckCircle, XCircle, RotateCcw, Trophy, ChevronRight, BookOpen, Zap, Key } from 'lucide-react'
import Link from 'next/link'

type Props = {
  questions: QuizQuestion[]
  topicId: string
  isCompleted: boolean
  onComplete: (score: number) => Promise<void>
  hasKey?: boolean
}

type Phase = 'question' | 'answered' | 'results' | 'review'

export default function QuizComponent({ questions, topicId, isCompleted, onComplete, hasKey }: Props) {
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [phase, setPhase] = useState<Phase>('question')
  const [submitting, setSubmitting] = useState(false)
  const [finalScore, setFinalScore] = useState(0)
  const [animating, setAnimating] = useState(false)

  // Gate: no key configured
  if (!hasKey) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-amber-900/20 border border-amber-700/40 flex items-center justify-center">
          <Key className="w-6 h-6 text-amber-400" />
        </div>
        <div>
          <h3 className="text-white font-semibold mb-1">OpenRouter key required</h3>
          <p className="text-sm text-gray-400 max-w-xs">
            Add your free OpenRouter key in Settings to unlock quizzes and progress through the course.
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

  const q = questions[current]
  const userAnswer = answers[current]
  const isCorrect = userAnswer === q?.correctIndex
  const isLast = current === questions.length - 1

  const handleSelect = (optionIdx: number) => {
    if (phase !== 'question') return
    setAnswers(prev => ({ ...prev, [current]: optionIdx }))
    setPhase('answered')
  }

  const handleNext = async () => {
    if (animating) return
    if (isLast) {
      // Calculate final score
      let correct = 0
      questions.forEach((q, idx) => {
        if (answers[idx] === q.correctIndex) correct++
      })
      const pct = Math.round((correct / questions.length) * 100)
      setFinalScore(pct)
      setPhase('results')
      if (pct >= 80) {
        setSubmitting(true)
        await onComplete(pct)
        setSubmitting(false)
      }
    } else {
      setAnimating(true)
      setTimeout(() => {
        setCurrent(prev => prev + 1)
        setPhase('question')
        setAnimating(false)
      }, 200)
    }
  }

  const handleRetry = () => {
    setAnswers({})
    setCurrent(0)
    setPhase('question')
    setFinalScore(0)
  }

  const correctCount = Object.entries(answers).filter(
    ([idx, ans]) => questions[Number(idx)]?.correctIndex === ans
  ).length

  // ── Results screen ───────────────────────────────────────────────────────
  if (phase === 'results' || phase === 'review') {
    const passed = finalScore >= 80
    return (
      <div className="space-y-6">
        {/* Score card */}
        <div className={`rounded-2xl border p-6 text-center ${
          passed ? 'bg-emerald-900/15 border-emerald-700/40' : 'bg-gray-900 border-gray-800'
        }`}>
          <div className="flex justify-center mb-4">
            {passed
              ? <Trophy className="w-12 h-12 text-emerald-400" />
              : <XCircle className="w-12 h-12 text-red-400" />}
          </div>
          <h2 className={`text-2xl font-bold mb-1 ${passed ? 'text-emerald-400' : 'text-white'}`}>
            {passed ? 'Quiz Passed!' : 'Not quite yet'}
          </h2>
          <p className="text-gray-400 mb-4">
            {correctCount} of {questions.length} correct — {finalScore}%
            {!passed && <span className="text-gray-500"> (need 80% to pass)</span>}
          </p>
          {passed && (
            <div className="inline-flex items-center gap-1.5 bg-yellow-900/20 border border-yellow-700/30 text-yellow-400 text-sm px-3 py-1.5 rounded-full mb-4">
              <Zap className="w-3.5 h-3.5" />
              XP earned on completion
            </div>
          )}
          {/* Mini score bar */}
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mt-2">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${passed ? 'bg-emerald-500' : 'bg-red-500'}`}
              style={{ width: `${finalScore}%` }}
            />
          </div>
          <div className="flex gap-3 justify-center mt-6">
            {!passed && (
              <button
                onClick={handleRetry}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
              >
                <RotateCcw className="w-4 h-4" /> Retry Quiz
              </button>
            )}
            <button
              onClick={() => setPhase(phase === 'review' ? 'results' : 'review')}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              {phase === 'review' ? 'Hide Review' : 'Review Answers'}
            </button>
          </div>
        </div>

        {/* Review mode */}
        {phase === 'review' && (
          <div className="space-y-4">
            {questions.map((q, idx) => {
              const ans = answers[idx]
              const correct = ans === q.correctIndex
              return (
                <div key={idx} className={`rounded-xl border p-5 ${
                  correct ? 'border-emerald-800/40 bg-emerald-900/5' : 'border-red-800/40 bg-red-900/5'
                }`}>
                  <div className="flex items-start gap-2 mb-3">
                    {correct
                      ? <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                      : <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />}
                    <p className="text-sm font-medium text-white">
                      <span className="text-gray-500 mr-1.5">Q{idx + 1}.</span>{q.question}
                    </p>
                  </div>
                  <div className="space-y-1.5 ml-6 mb-3">
                    {q.options.map((opt, oIdx) => {
                      const isUserAnswer = oIdx === ans
                      const isCorrectAnswer = oIdx === q.correctIndex
                      return (
                        <div key={oIdx} className={`text-xs px-3 py-2 rounded-lg flex items-center gap-2 ${
                          isCorrectAnswer
                            ? 'bg-emerald-900/20 text-emerald-300 border border-emerald-800/30'
                            : isUserAnswer && !isCorrectAnswer
                            ? 'bg-red-900/20 text-red-300 border border-red-800/30'
                            : 'text-gray-500'
                        }`}>
                          {isCorrectAnswer && <CheckCircle className="w-3 h-3 shrink-0" />}
                          {isUserAnswer && !isCorrectAnswer && <XCircle className="w-3 h-3 shrink-0" />}
                          {opt}
                          {isCorrectAnswer && <span className="ml-auto text-emerald-500 font-medium">Correct</span>}
                          {isUserAnswer && !isCorrectAnswer && <span className="ml-auto text-red-400 font-medium">Your answer</span>}
                        </div>
                      )
                    })}
                  </div>
                  <p className={`text-xs ml-6 p-2.5 rounded-lg ${correct ? 'bg-emerald-900/10 text-emerald-300/80' : 'bg-amber-900/10 text-amber-300/80'}`}>
                    {q.explanation}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── Question screen ──────────────────────────────────────────────────────
  return (
    <div className={`space-y-6 transition-opacity duration-200 ${animating ? 'opacity-0' : 'opacity-100'}`}>
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Question {current + 1} of {questions.length}</span>
          <span>{correctCount} correct so far</span>
        </div>
        <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
            style={{ width: `${((current + (phase === 'answered' ? 1 : 0)) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <p className="font-medium text-white text-base leading-relaxed mb-5">
          {q.question}
        </p>

        <div className="space-y-2.5">
          {q.options.map((option, oIdx) => {
            const isSelected = userAnswer === oIdx
            const showCorrect = phase === 'answered' && oIdx === q.correctIndex
            const showWrong = phase === 'answered' && isSelected && oIdx !== q.correctIndex

            return (
              <button
                key={oIdx}
                onClick={() => handleSelect(oIdx)}
                disabled={phase === 'answered'}
                className={`w-full text-left px-4 py-3.5 rounded-xl border text-sm transition-all duration-200 flex items-center gap-3 ${
                  showCorrect
                    ? 'border-emerald-500 bg-emerald-900/25 text-emerald-200'
                    : showWrong
                    ? 'border-red-500 bg-red-900/25 text-red-200'
                    : isSelected
                    ? 'border-emerald-500 bg-emerald-900/15 text-white'
                    : phase === 'answered'
                    ? 'border-gray-800 bg-gray-800/30 text-gray-600 cursor-default'
                    : 'border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-500 hover:bg-gray-800 cursor-pointer'
                }`}
              >
                <span className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 text-xs font-medium transition-all ${
                  showCorrect ? 'border-emerald-500 bg-emerald-500 text-white' :
                  showWrong ? 'border-red-500 bg-red-500 text-white' :
                  isSelected ? 'border-emerald-500 bg-emerald-500 text-white' :
                  'border-gray-600 text-gray-400'
                }`}>
                  {showCorrect ? <CheckCircle className="w-4 h-4" /> :
                   showWrong ? <XCircle className="w-4 h-4" /> :
                   String.fromCharCode(65 + oIdx)}
                </span>
                <span>{option}</span>
              </button>
            )
          })}
        </div>

        {/* Per-question explanation */}
        {phase === 'answered' && (
          <div className={`mt-5 p-4 rounded-xl text-sm border ${
            isCorrect
              ? 'bg-emerald-900/15 border-emerald-800/30 text-emerald-300'
              : 'bg-amber-900/10 border-amber-800/20 text-amber-300'
          }`}>
            <span className="font-medium mr-1">{isCorrect ? '✓ Correct!' : '✗ Incorrect.'}</span>
            {q.explanation}
          </div>
        )}
      </div>

      {/* Next / Submit button */}
      {phase === 'answered' && (
        <button
          onClick={handleNext}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-xl transition-colors"
        >
          {isLast ? (submitting ? 'Saving…' : 'See Results') : 'Next Question'}
          {!isLast && <ChevronRight className="w-4 h-4" />}
        </button>
      )}

      {phase === 'question' && (
        <p className="text-center text-xs text-gray-600">Select an answer to continue</p>
      )}
    </div>
  )
}
