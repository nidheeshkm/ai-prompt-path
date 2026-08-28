import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/server/verify-admin'
import { createAdminClient } from '@/server/supabase-admin'
import { decryptApiKey } from '@/server/crypto'
import { PROVIDER_CONFIG } from '@/lib/providers'
import type { Provider } from '@/lib/providers'
import type { AudienceGroup } from '../audience/route'

const AUDIENCE_CONTEXT: Record<AudienceGroup, string> = {
  not_enrolled:        'Signed up but never enrolled in a course. Goal: get them to pick and enroll in their first course today. Tone: encouraging, low-pressure.',
  enrolled_not_started:'Enrolled in a course but never opened a topic. Goal: get them to start their first lesson. Tone: warm nudge, make the first step feel tiny.',
  inactive_signup:     'Signed up 3+ days ago, never returned after registration. Goal: re-engage with a compelling reason to come back. Tone: friendly, mild FOMO.',
  missing_streak:      'Active learner who hasn\'t made progress in 3+ days. Goal: reignite their streak today. Tone: supportive urgency, small daily wins.',
  all_active:          'All active users — platform-wide announcement (new course, feature, or update). Goal: inform and excite. Tone: enthusiastic announcement.',
}

const SYSTEM_PROMPT = `You are a B2C marketing email specialist with 15+ years of experience writing high-converting lifecycle emails for SaaS and e-learning platforms.

PromptPath is an AI/prompt engineering learning platform with courses on LLMs, RAG, LangChain, and AI development. Learners earn XP, maintain streaks, and receive certificates.

Write a marketing email for a specific learner segment. Rules:
- Subject: 6–10 words, punchy, personal, no spam triggers
- Body: 80–140 words, plain text only (no markdown, no bullets)
- First person from "the PromptPath team", conversational tone
- One clear CTA at the end
- No sign-off (added automatically)
- Output ONLY valid JSON: {"subject": "...", "body": "..."}`

export async function POST(request: NextRequest) {
  try {
    const verified = await verifyAdminRequest(request)
    if (!verified) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    let body: { group?: AudienceGroup }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'invalid request body' }, { status: 400 })
    }

    const { group } = body
    if (!group || !AUDIENCE_CONTEXT[group]) {
      return NextResponse.json({ error: 'valid group required' }, { status: 400 })
    }

    // Fetch admin's active provider + key
    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('active_provider')
      .eq('id', verified.userId)
      .single()

    const activeProvider = profile?.active_provider as Provider | null
    if (!activeProvider) {
      return NextResponse.json(
        { error: 'no_key', message: 'No AI provider configured. Add a provider key in Settings first.' },
        { status: 422 },
      )
    }

    const { data: keyRow } = await admin
      .from('provider_keys')
      .select('encrypted_key')
      .eq('user_id', verified.userId)
      .eq('provider', activeProvider)
      .single()

    if (!keyRow?.encrypted_key) {
      return NextResponse.json(
        { error: 'no_key', message: 'No AI provider key found. Configure one in Settings.' },
        { status: 422 },
      )
    }

    let apiKey: string
    try {
      apiKey = await decryptApiKey(keyRow.encrypted_key)
    } catch {
      return NextResponse.json({ error: 'decrypt_error', message: 'Could not decrypt your API key.' }, { status: 500 })
    }

    const cfg = PROVIDER_CONFIG[activeProvider]
    const userMessage = `Write a marketing email for this learner segment:\n${AUDIENCE_CONTEXT[group].trim()}`

    let raw = ''

    try {
      if (cfg.format === 'anthropic') {
        const res = await fetch(cfg.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: cfg.model,
            system: SYSTEM_PROMPT,
            messages: [{ role: 'user', content: userMessage }],
            max_tokens: 3500,
            temperature: 0.8,
          }),
        })
        if (!res.ok) {
          const status = res.status
          if (status === 401 || status === 403) return NextResponse.json({ error: 'invalid_key', message: 'API key rejected by provider.' }, { status: 422 })
          return NextResponse.json({ error: 'provider_error', message: 'AI provider returned an error.' }, { status: 502 })
        }
        const data = await res.json()
        raw = data.content?.[0]?.text ?? ''
      } else {
        const res = await fetch(cfg.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            ...(activeProvider === 'openrouter' ? {
              'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://promptpath.app',
              'X-Title': 'PromptPath',
            } : {}),
          },
          body: JSON.stringify({
            model: cfg.model,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: userMessage },
            ],
            max_tokens: 3500,
            temperature: 0.8,
          }),
        })
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) return NextResponse.json({ error: 'invalid_key', message: 'API key rejected by provider.' }, { status: 422 })
          return NextResponse.json({ error: 'provider_error', message: 'AI provider returned an error.' }, { status: 502 })
        }
        const data = await res.json()
        raw = data.choices?.[0]?.message?.content ?? ''
      }
    } catch {
      return NextResponse.json({ error: 'network_error', message: 'Could not reach the AI provider.' }, { status: 502 })
    }

    // Parse JSON from AI response
    try {
      const match = raw.match(/\{[\s\S]*\}/)
      const parsed = JSON.parse(match?.[0] ?? raw)
      if (!parsed.subject || !parsed.body) throw new Error('missing fields')
      return NextResponse.json({ subject: parsed.subject as string, body: parsed.body as string })
    } catch {
      return NextResponse.json(
        { error: 'parse_error', message: 'AI returned an unexpected format. Try again.' },
        { status: 502 },
      )
    }
  } catch (err) {
    console.error('[marketing/generate] unhandled error:', err)
    return NextResponse.json({ error: 'internal_error', message: 'An unexpected error occurred.' }, { status: 500 })
  }
}
