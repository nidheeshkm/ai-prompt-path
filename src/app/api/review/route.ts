import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { PROVIDER_CONFIG } from '@/lib/providers'
import type { Provider } from '@/lib/providers'

export async function POST(request: Request) {
  try {
    const { code, topicId, topicTitle, rubric, instructions, reviewMode = 'deep_dive' } = await request.json()

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

    const systemPrompt = buildSystemPrompt(reviewMode, topicId, topicTitle, instructions, rubric)

    const userMessage = `STUDENT CODE:\n\`\`\`\n${code}\n\`\`\``

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
          max_tokens: maxTokensForMode(reviewMode),
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
          max_tokens: maxTokensForMode(reviewMode),
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
        correct:      Array.isArray(parsed.feedback?.correct)      ? parsed.feedback.correct      : [],
        improvements: Array.isArray(parsed.feedback?.improvements) ? parsed.feedback.improvements : [],
        hint:         parsed.feedback?.hint || '',
        walkthrough:  Array.isArray(parsed.feedback?.walkthrough)  ? parsed.feedback.walkthrough  : null,
        concept_note: parsed.feedback?.concept_note || null,
        missing:      Array.isArray(parsed.feedback?.missing)      ? parsed.feedback.missing      : null,
        relearn:      Array.isArray(parsed.feedback?.relearn)      ? parsed.feedback.relearn      : null,
      },
    })
  } catch (err) {
    console.error('Review API error:', err)
    return NextResponse.json({ error: 'Failed to review code' }, { status: 500 })
  }
}

function buildSystemPrompt(
  mode: string,
  topicId: string,
  topicTitle: string,
  instructions: string | undefined,
  rubric: string[],
): string {
  const header = `You are an expert code mentor reviewing a student's code submission.
Return ONLY valid JSON — no markdown, no code fences.

TOPIC: ${topicTitle} (${topicId})
LEARNING OBJECTIVE: ${instructions?.slice(0, 600) || topicTitle}

RUBRIC ITEMS:
${rubric.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Score 0–100. Passing threshold is 70.`

  if (mode === 'quick') {
    return `${header}

Return this JSON for any outcome:
{
  "score": <number>,
  "passed": <boolean>,
  "feedback": {
    "correct": ["2–3 short bullets of what they got right"],
    "improvements": ["1–3 short bullets of what is wrong or missing, empty array if passed cleanly"],
    "hint": "one-line tip if score < 70, else empty string",
    "walkthrough": null,
    "concept_note": null,
    "missing": null,
    "relearn": null
  }
}`
  }

  if (mode === 'standard') {
    return `${header}

IF PASSED (score >= 70) return:
{
  "score": <number>,
  "passed": true,
  "feedback": {
    "correct": ["3–4 bullets explaining what the student got right and why it works"],
    "improvements": ["any minor polish suggestions, or empty array"],
    "hint": "",
    "walkthrough": null,
    "concept_note": "One paragraph — connect their solution to the broader concept, name a pitfall it avoids or a production pattern it illustrates.",
    "missing": null,
    "relearn": null
  }
}

IF FAILED (score < 70) return:
{
  "score": <number>,
  "passed": false,
  "feedback": {
    "correct": ["what they got right"],
    "improvements": ["specific, actionable fix for each issue — reference what to add or change"],
    "hint": "one targeted hint to get them unstuck",
    "walkthrough": null,
    "concept_note": null,
    "missing": null,
    "relearn": null
  }
}`
  }

  // deep_dive (default)
  return `${header}

IF PASSED (score >= 70) return:
{
  "score": <number>,
  "passed": true,
  "feedback": {
    "correct": ["concise bullet per rubric item satisfied"],
    "improvements": ["minor polish suggestions if any, else empty array"],
    "hint": "",
    "walkthrough": [
      {
        "step": 1,
        "title": "Short title for this logical section",
        "explanation": "Explain exactly what the student's own code does — use their actual variable names, function calls, and logic. Describe what happens under the hood: what data flows, what each call returns, why the approach works. Be specific, not generic."
      }
    ],
    "concept_note": "One paragraph connecting their solution to the broader concept — what this pattern enables, a pitfall it avoids, or how it fits production usage.",
    "missing": null,
    "relearn": null
  }
}
Walkthrough: 3–6 steps covering key logical sections of their code.

IF FAILED (score < 70) return:
{
  "score": <number>,
  "passed": false,
  "feedback": {
    "correct": ["what they got right"],
    "improvements": [],
    "hint": "",
    "walkthrough": null,
    "concept_note": null,
    "missing": [
      {
        "what": "Short label of what is missing or wrong",
        "why_it_matters": "Why this matters for the learning objective — what breaks without it",
        "how_to_fix": "Concrete guidance — what to write, what function to call, what to change"
      }
    ],
    "relearn": ["Topic or concept name the student should revisit"]
  }
}`
}

function maxTokensForMode(mode: string): number {
  if (mode === 'quick')    return 400
  if (mode === 'standard') return 900
  return 2000 // deep_dive
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
