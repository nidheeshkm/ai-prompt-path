import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { PROVIDER_CONFIG } from '@/lib/providers'
import type { Provider } from '@/lib/providers'

export async function POST(request: Request) {
  try {
    const { code, topicId, topicTitle, rubric, instructions } = await request.json()

    if (!code || !topicId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // ── Resolve provider + key server-side — never accept from the client ────
    let provider: Provider = 'openrouter'
    let apiKey = process.env.OPENROUTER_API_KEY ?? ''

    const cookieStore = await cookies()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: { getAll: () => cookieStore.getAll() },
    })

    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('active_provider, openrouter_api_key, openai_api_key, anthropic_api_key, groq_api_key, xai_api_key')
        .eq('id', user.id)
        .single()

      if (profile) {
        const activeProvider = (profile.active_provider || 'openrouter') as Provider
        const keyMap: Record<Provider, string | null> = {
          openrouter: profile.openrouter_api_key,
          openai: profile.openai_api_key,
          anthropic: profile.anthropic_api_key,
          groq: profile.groq_api_key,
          xai: profile.xai_api_key,
        }
        const userKey = keyMap[activeProvider]
        if (userKey) {
          provider = activeProvider
          apiKey = userKey
        }
      }
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'no_key', message: 'No AI provider key configured. Please add your key in Settings.' },
        { status: 401 }
      )
    }
    // ─────────────────────────────────────────────────────────────────────────

    const cfg = PROVIDER_CONFIG[provider]

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

    const userMessage = `STUDENT CODE:\n\`\`\`python\n${code}\n\`\`\``

    let content: string

    if (cfg.format === 'anthropic') {
      const response = await fetch(cfg.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: cfg.model,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
          temperature: 0.3,
          max_tokens: 1000,
        }),
      })
      if (!response.ok) {
        console.error(`${provider} error:`, response.status)
        return NextResponse.json(fallbackReview(code, rubric))
      }
      const data = await response.json()
      content = data.content?.[0]?.text || ''
    } else {
      const response = await fetch(cfg.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          ...(provider === 'openrouter' ? {
            'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://promptpath.vercel.app',
            'X-Title': 'PromptPath',
          } : {}),
        },
        body: JSON.stringify({
          model: cfg.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.3,
          max_tokens: 1000,
        }),
      })
      if (!response.ok) {
        console.error(`${provider} error:`, response.status)
        return NextResponse.json(fallbackReview(code, rubric))
      }
      const data = await response.json()
      content = data.choices?.[0]?.message?.content || ''
    }

    let parsed
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      parsed = JSON.parse(jsonMatch?.[0] || content)
    } catch {
      return NextResponse.json(fallbackReview(code, rubric))
    }

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
    return NextResponse.json({ error: 'Failed to review code' }, { status: 500 })
  }
}

function fallbackReview(code: string, rubric: string[]) {
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

  rubric?.forEach((item) => {
    const keywords = item.toLowerCase().split(/\s+/).filter(w => w.length > 4)
    const found = keywords.some(kw => code.toLowerCase().includes(kw))
    if (found) { score += 5 }
    else { improvements.push(`Ensure: ${item}`) }
  })

  return {
    score: Math.min(100, score),
    passed: Math.min(100, score) >= 70,
    feedback: {
      correct: correct.length ? correct : ['Code submitted for review'],
      improvements: improvements.length ? improvements : ['Consider adding more detail to your implementation'],
      hint: score < 70 ? 'Review the rubric items and make sure each one is addressed in your code.' : '',
    },
  }
}
