'use client'

import { useState } from 'react'
import type { QuizQuestion } from '@/data/curriculum'
import type { QuizSubmission } from '@/lib/supabase'
import { CheckCircle, XCircle, RotateCcw, Trophy, ChevronRight, BookOpen, Zap, Key } from 'lucide-react'
import Link from 'next/link'

type Props = {
  questions: QuizQuestion[]
  topicId: string
  isCompleted: boolean
  bestScore?: number
  storedSubmission?: QuizSubmission | null
  onComplete: (score: number, submission: QuizSubmission) => Promise<void>
  hasKey?: boolean
}

type Phase = 'completed' | 'question' | 'answered' | 'results' | 'review'

export default function QuizComponent({ questions, topicId, isCompleted, bestScore = 0, storedSubmission, onComplete, hasKey }: Props) {
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [phase, setPhase] = useState<Phase>(isCompleted ? 'completed' : 'question')
  const [submitting, setSubmitting] = useState(false)
  const [finalScore, setFinalScore] = useState(isCompleted ? bestScore : 0)
  const [animating, setAnimating] = useState(false)

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
            Add a free OpenRouter or Groq key in Settings to unlock quizzes and progress through the course.
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

  // ── Already-completed summary ────────────────────────────────────────────
  if (phase === 'completed') {
    const passed = bestScore >= 80
    const prevAnswers = storedSubmission?.answers
    return (
      <div className="space-y-6">
        <div className={`rounded-2xl border p-8 text-center ${passed ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
          <div className="flex justify-center mb-4">
            <Trophy className={`w-12 h-12 ${passed ? 'text-emerald-500' : 'text-slate-400'}`} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">Quiz Completed</h2>
          <p className="text-slate-500 mb-4">
            Your best score: <span className={`font-bold text-lg ${passed ? 'text-emerald-600' : 'text-slate-700'}`}>{bestScore}%</span>
          </p>
          {passed && (
            <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-sm px-3 py-1.5 rounded-full mb-4">
              <Zap className="w-3.5 h-3.5" /> XP earned
            </div>
          )}
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-6">
            <div
              className={`h-full rounded-full transition-all duration-700 ${passed ? 'bg-emerald-500' : 'bg-amber-400'}`}
              style={{ width: `${bestScore}%` }}
            />
          </div>
          <button
            onClick={() => {
              setAnswers({})
              setCurrent(0)
              setFinalScore(0)
              setPhase('question')
            }}
            className="flex items-center gap-2 mx-auto bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Retake Quiz
          </button>
        </div>

        {/* Previous answers review */}
        {prevAnswers && prevAnswers.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Your Previous Answers</h3>
            {questions.map((q, idx) => {
              const ans = prevAnswers[idx] ?? -1
              const correct = ans === q.correctIndex
              return (
                <div key={idx} className={`rounded-xl border p-5 ${correct ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
                  <div className="flex items-start gap-2 mb-3">
                    {correct
                      ? <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                      : <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />}
                    <p className="text-sm font-medium text-slate-900">
                      <span className="text-slate-400 mr-1.5">Q{idx + 1}.</span>{q.question}
                    </p>
                  </div>
                  <div className="space-y-1.5 ml-6 mb-3">
                    {q.options.map((opt, oIdx) => {
                      const isUserAnswer = oIdx === ans
                      const isCorrectAnswer = oIdx === q.correctIndex
                      return (
                        <div key={oIdx} className={`text-xs px-3 py-2 rounded-lg flex items-center gap-2 ${
                          isCorrectAnswer
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : isUserAnswer && !isCorrectAnswer
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : 'text-slate-500'
                        }`}>
                          {isCorrectAnswer && <CheckCircle className="w-3 h-3 shrink-0" />}
                          {isUserAnswer && !isCorrectAnswer && <XCircle className="w-3 h-3 shrink-0" />}
                          {opt}
                          {isCorrectAnswer && <span className="ml-auto text-emerald-700 font-medium">Correct</span>}
                          {isUserAnswer && !isCorrectAnswer && <span className="ml-auto text-red-600 font-medium">Your answer</span>}
                        </div>
                      )
                    })}
                  </div>
                  <p className={`text-xs ml-6 p-2.5 rounded-lg ${correct ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
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
        const submission: QuizSubmission = {
          type: 'quiz',
          answers: questions.map((_, idx) => answers[idx] ?? -1),
        }
        await onComplete(pct, submission)
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
    setFinalScore(0)
    setPhase('question')
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
          passed ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'
        }`}>
          <div className="flex justify-center mb-4">
            {passed
              ? <Trophy className="w-12 h-12 text-emerald-500" />
              : <XCircle className="w-12 h-12 text-red-400" />}
          </div>
          <h2 className={`text-2xl font-bold mb-1 ${passed ? 'text-emerald-700' : 'text-slate-900'}`}>
            {passed ? 'Quiz Passed!' : 'Not quite yet'}
          </h2>
          <p className="text-slate-500 mb-4">
            {correctCount} of {questions.length} correct — {finalScore}%
            {!passed && <span className="text-slate-400"> (need 80% to pass)</span>}
          </p>
          {passed && (
            <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-sm px-3 py-1.5 rounded-full mb-4">
              <Zap className="w-3.5 h-3.5" />
              XP earned on completion
            </div>
          )}
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-2">
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
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
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
                  correct ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'
                }`}>
                  <div className="flex items-start gap-2 mb-3">
                    {correct
                      ? <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                      : <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />}
                    <p className="text-sm font-medium text-slate-900">
                      <span className="text-slate-400 mr-1.5">Q{idx + 1}.</span>{q.question}
                    </p>
                  </div>
                  <div className="space-y-1.5 ml-6 mb-3">
                    {q.options.map((opt, oIdx) => {
                      const isUserAnswer = oIdx === ans
                      const isCorrectAnswer = oIdx === q.correctIndex
                      return (
                        <div key={oIdx} className={`text-xs px-3 py-2 rounded-lg flex items-center gap-2 ${
                          isCorrectAnswer
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : isUserAnswer && !isCorrectAnswer
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : 'text-slate-500'
                        }`}>
                          {isCorrectAnswer && <CheckCircle className="w-3 h-3 shrink-0" />}
                          {isUserAnswer && !isCorrectAnswer && <XCircle className="w-3 h-3 shrink-0" />}
                          {opt}
                          {isCorrectAnswer && <span className="ml-auto text-emerald-700 font-medium">Correct</span>}
                          {isUserAnswer && !isCorrectAnswer && <span className="ml-auto text-red-600 font-medium">Your answer</span>}
                        </div>
                      )
                    })}
                  </div>
                  <p className={`text-xs ml-6 p-2.5 rounded-lg ${correct ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
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
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Question {current + 1} of {questions.length}</span>
          <span>{correctCount} correct so far</span>
        </div>
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
            style={{ width: `${((current + (phase === 'answered' ? 1 : 0)) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <p className="font-medium text-slate-900 text-base leading-relaxed mb-5">
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
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                    : showWrong
                    ? 'border-red-400 bg-red-50 text-red-800'
                    : isSelected
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                    : phase === 'answered'
                    ? 'border-slate-100 bg-slate-50 text-slate-400 cursor-default'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 cursor-pointer'
                }`}
              >
                <span className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 text-xs font-medium transition-all ${
                  showCorrect ? 'border-emerald-500 bg-emerald-500 text-white' :
                  showWrong ? 'border-red-500 bg-red-500 text-white' :
                  isSelected ? 'border-emerald-500 bg-emerald-500 text-white' :
                  'border-slate-300 text-slate-500'
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
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
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
        <p className="text-center text-xs text-slate-400">Select an answer to continue</p>
      )}
    </div>
  )
}
