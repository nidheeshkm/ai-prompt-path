import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { answers, questions } = await request.json()

    if (!answers || !questions) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    let correct = 0
    const results = questions.map((q: { correctIndex: number; explanation: string }, idx: number) => {
      const isCorrect = answers[idx] === q.correctIndex
      if (isCorrect) correct++
      return {
        correct: isCorrect,
        explanation: q.explanation,
      }
    })

    const score = Math.round((correct / questions.length) * 100)

    return NextResponse.json({
      score,
      passed: score >= 80,
      correct,
      total: questions.length,
      results,
    })
  } catch (err) {
    console.error('Quiz API error:', err)
    return NextResponse.json(
      { error: 'Failed to check quiz' },
      { status: 500 }
    )
  }
}
