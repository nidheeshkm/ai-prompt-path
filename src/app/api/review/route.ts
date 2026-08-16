import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { code, topicId, topicTitle, rubric, instructions } = await request.json()

    if (!code || !topicId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      // Fallback review when no API key is configured
      return NextResponse.json(fallbackReview(code, rubric))
    }

    const systemPrompt = `You are a LangChain expert reviewing a student's Python code.
You are strict but encouraging. Evaluate the code against the rubric and return ONLY valid JSON.

TOPIC: ${topicTitle} (${topicId})
LEARNING OBJECTIVE: ${instructions?.slice(0, 500) || topicTitle}

RUBRIC ITEMS:
${(rubric || []).map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}

Evaluate and return JSON in this exact format (no markdown, no code fences):
{
  "score": <number 0-100>,
  "passed": <boolean, true if score >= 70>,
  "feedback": {
    "correct": ["things the student got right"],
    "improvements": ["specific actionable fixes needed"],
    "hint": "a progressive hint if they didn't pass"
  }
}`

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://promptpath.vercel.app',
        'X-Title': 'PromptPath',
      },
      body: JSON.stringify({
        model: 'openrouter/auto',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `STUDENT CODE:\n\`\`\`python\n${code}\n\`\`\`` },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    })

    if (!response.ok) {
      console.error('OpenRouter error:', response.status)
      return NextResponse.json(fallbackReview(code, rubric))
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    // Parse JSON from response (handle possible markdown wrapping)
    let parsed
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      parsed = JSON.parse(jsonMatch?.[0] || content)
    } catch {
      return NextResponse.json(fallbackReview(code, rubric))
    }

    // Validate shape
    return NextResponse.json({
      score: Math.min(100, Math.max(0, Number(parsed.score) || 0)),
      passed: Boolean(parsed.passed),
      feedback: {
        correct: Array.isArray(parsed.feedback?.correct) ? parsed.feedback.correct : [],
        improvements: Array.isArray(parsed.feedback?.improvements) ? parsed.feedback.improvements : [],
        hint: parsed.feedback?.hint || '',
      },
    })
  } catch (err) {
    console.error('Review API error:', err)
    return NextResponse.json(
      { error: 'Failed to review code' },
      { status: 500 }
    )
  }
}

function fallbackReview(code: string, rubric: string[]) {
  // Simple heuristic review when OpenRouter is unavailable
  const lines = code.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'))
  const hasImports = code.includes('import') || code.includes('from')
  const hasTodo = code.includes('TODO') || code.includes('your code here')
  const hasSubstantialCode = lines.length > 5

  let score = 40
  const correct: string[] = []
  const improvements: string[] = []

  if (hasImports) { score += 10; correct.push('Proper imports included') }
  if (hasSubstantialCode) { score += 15; correct.push('Substantial implementation provided') }
  if (!hasTodo) { score += 15; correct.push('All TODO sections completed') }
  else { improvements.push('Complete all TODO sections in the code') }

  // Check rubric keywords
  rubric?.forEach((item) => {
    const keywords = item.toLowerCase().split(/\s+/).filter(w => w.length > 4)
    const found = keywords.some(kw => code.toLowerCase().includes(kw))
    if (found) { score += 5 }
    else { improvements.push(`Ensure: ${item}`) }
  })

  score = Math.min(100, score)

  return {
    score,
    passed: score >= 70,
    feedback: {
      correct: correct.length ? correct : ['Code submitted for review'],
      improvements: improvements.length ? improvements : ['Consider adding more detail to your implementation'],
      hint: score < 70 ? 'Review the rubric items and make sure each one is addressed in your code.' : '',
    },
  }
}
