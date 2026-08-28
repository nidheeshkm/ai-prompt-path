import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { gradeQuiz } from '@/server/curriculum'
import { getCourseTopics } from '@/data/curriculum'

export async function POST(request: Request) {
  try {
    const { courseId, topicId, answers } = await request.json()

    if (!courseId || !topicId || !Array.isArray(answers)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify the user is authenticated
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } },
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Grade from DB — never trust client-supplied correctIndex
    const graded = await gradeQuiz(courseId, topicId, answers)

    if (!graded) {
      // DB not seeded yet — fall back to curriculum metadata (server-side only)
      const topic = getCourseTopics(courseId).find(t => t.id === topicId)
      if (!topic?.quiz) {
        return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
      }

      let correct = 0
      const results = topic.quiz.map((q, idx) => {
        const isCorrect = answers[idx] === q.correctIndex
        if (isCorrect) correct++
        return { correct: isCorrect, explanation: q.explanation }
      })
      const score = Math.round((correct / topic.quiz.length) * 100)
      return NextResponse.json({ score, passed: score >= 80, correct, total: topic.quiz.length, results })
    }

    return NextResponse.json({
      score:   graded.score,
      passed:  graded.passed,
      correct: graded.results.filter(r => r.correct).length,
      total:   graded.results.length,
      results: graded.results,
    })
  } catch (err) {
    console.error('Quiz API error:', err)
    return NextResponse.json({ error: 'Failed to check quiz' }, { status: 500 })
  }
}
