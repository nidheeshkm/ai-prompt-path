import { NextResponse } from 'next/server'
import { PROVIDER_CONFIG } from '@/lib/providers'
import type { Provider } from '@/lib/providers'

// Test a provider key before saving it. The key is in transit only — never stored here.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const { provider, key } = body ?? {}

  if (!provider || !key || typeof key !== 'string' || key.length < 10 || key.length > 500) {
    return NextResponse.json({ ok: false, message: 'Invalid request' }, { status: 400 })
  }

  const cfg = PROVIDER_CONFIG[provider as Provider]
  if (!cfg) {
    return NextResponse.json({ ok: false, message: 'Unknown provider' }, { status: 400 })
  }

  try {
    let response: Response

    if (cfg.format === 'anthropic') {
      response = await fetch(cfg.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: cfg.model,
          messages: [{ role: 'user', content: 'Reply with the single word: ok' }],
          max_tokens: 5,
        }),
      })
    } else {
      response = await fetch(cfg.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
          ...(provider === 'openrouter' ? {
            'HTTP-Referer': 'https://promptpath.vercel.app',
            'X-Title': 'PromptPath',
          } : {}),
        },
        body: JSON.stringify({
          model: cfg.model,
          messages: [{ role: 'user', content: 'Reply with the single word: ok' }],
          max_tokens: 5,
        }),
      })
    }

    if (response.ok) {
      return NextResponse.json({ ok: true, message: 'Connection successful — key is valid.' })
    }
    const data = await response.json().catch(() => ({}))
    const msg = (data?.error?.message as string) || `Error ${response.status} — check your key.`
    return NextResponse.json({ ok: false, message: msg })
  } catch {
    return NextResponse.json({ ok: false, message: 'Could not reach provider. Check your internet connection.' })
  }
}
