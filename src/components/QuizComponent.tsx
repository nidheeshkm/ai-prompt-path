'use client'

import { useState } from 'react'
import type { QuizQuestion } from '@/data/curriculum'
import { CheckCircle, XCircle, RotateCcw, Trophy } from 'lucide-react'

type Props = {
  questions: QuizQuestion[]
  topicId: string
  isCompleted: boolean
  onComplete: (score: number) => Promise<void>
}

export default function QuizComponent({ questions, topicId, isCompleted, onComplete }: Props) {
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const handleSelect = (questionIdx: number, optionIdx: number) => {
    if (submitted) return
    setAnswers(prev => ({ ...prev, [questionIdx]: optionIdx }))
  }

  const handleSubmit = async () => {
    if (Object.keys(answers).length < questions.length) return

    let correct = 0
    questions.forEach((q, idx) => {
      if (answers[idx] === q.correctIndex) correct++
    })

    const pct = Math.round((correct / questions.length) * 100)
    setScore(pct)
    setSubmitted(true)

    if (pct >= 80) {
      setSubmitting(true)
      await onComplete(pct)
      setSubmitting(false)
    }
  }

  const handleRetry = () => {
    setAnswers({})
    setSubmitted(false)
    setScore(0)
  }

  const passed = score >= 80
  const allAnswered = Object.keys(answers).length === questions.length

  return (
    <div className="space-y-6">
      {/* Result banner */}
      {submitted && (
        <div className={`p-4 rounded-xl border flex items-center justify-between ${
          passed
            ? 'bg-emerald-900/20 border-emerald-700/40'
            : 'bg-red-900/20 border-red-700/40'
        }`}>
          <div className="flex items-center gap-3">
            {passed ? (
              <Trophy className="w-6 h-6 text-emerald-400" />
            ) : (
              <XCircle className="w-6 h-6 text-red-400" />
            )}
            <div>
              <p className={`font-semibold ${passed ? 'text-emerald-400' : 'text-red-400'}`}>
                {passed ? 'Passed!' : 'Not quite...'}
              </p>
              <p className="text-sm text-gray-400">
                Score: {score}% ({Math.round(score * questions.length / 100)}/{questions.length} correct)
                {!passed && ' — Need 80% to pass'}
              </p>
            </div>
          </div>
          {!passed && (
            <button
              onClick={handleRetry}
              className="flex items-center gap-1 text-sm text-gray-300 hover:text-white bg-gray-800 px-3 py-1.5 rounded-lg"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Retry
            </button>
          )}
        </div>
      )}

      {/* Questions */}
      {questions.map((q, qIdx) => {
        const userAnswer = answers[qIdx]
        const isCorrect = submitted && userAnswer === q.correctIndex
        const isWrong = submitted && userAnswer !== undefined && userAnswer !== q.correctIndex

        return (
          <div key={qIdx} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="font-medium text-white mb-4">
              <span className="text-gray-500 mr-2">{qIdx + 1}.</span>
              {q.question}
            </p>
            <div className="space-y-2">
              {q.options.map((option, oIdx) => {
                const isSelected = userAnswer === oIdx
                const showCorrect = submitted && oIdx === q.correctIndex
                const showWrong = submitted && isSelected && oIdx !== q.correctIndex

                return (
                  <button
                    key={oIdx}
                    onClick={() => handleSelect(qIdx, oIdx)}
                    disabled={submitted}
                    className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors flex items-center gap-3 ${
                      showCorrect
                        ? 'border-emerald-600 bg-emerald-900/20 text-emerald-300'
                        : showWrong
                        ? 'border-red-600 bg-red-900/20 text-red-300'
                        : isSelected
                        ? 'border-emerald-500 bg-emerald-900/10 text-white'
                        : 'border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-600 hover:bg-gray-800'
                    } ${submitted ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    <span className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 text-xs ${
                      showCorrect ? 'border-emerald-500 bg-emerald-500 text-white' :
                      showWrong ? 'border-red-500 bg-red-500 text-white' :
                      isSelected ? 'border-emerald-500 bg-emerald-500 text-white' :
                      'border-gray-600'
                    }`}>
                      {showCorrect ? <CheckCircle className="w-4 h-4" /> :
                       showWrong ? <XCircle className="w-4 h-4" /> :
                       String.fromCharCode(65 + oIdx)}
                    </span>
                    {option}
                  </button>
                )
              })}
            </div>
            {submitted && (
              <div className={`mt-3 p-3 rounded-lg text-sm ${
                isCorrect ? 'bg-emerald-900/10 text-emerald-300' : 'bg-amber-900/10 text-amber-300'
              }`}>
                {q.explanation}
              </div>
            )}
          </div>
        )
      })}

      {/* Submit button */}
      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={!allAnswered}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium rounded-xl transition-colors"
        >
          {allAnswered ? 'Submit Answers' : `Answer all questions (${Object.keys(answers).length}/${questions.length})`}
        </button>
      )}
    </div>
  )
}
