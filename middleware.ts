import { NextRequest, NextResponse } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Two separate windows — both must pass for the request to go through:
//   burst:     5 / minute  — blocks scripts hammering in rapid succession
//   sustained: 60 / hour   — generous headroom for real learners retrying a hard topic
let burstLimiter:     Ratelimit | null = null
let sustainedLimiter: Ratelimit | null = null

function getLimiters(): { burst: Ratelimit; sustained: Ratelimit } | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null
  }
  if (!burstLimiter || !sustainedLimiter) {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    burstLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 m'),
      prefix: 'rl:review:burst',
      analytics: false,
    })
    sustainedLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, '1 h'),
      prefix: 'rl:review:sustained',
      analytics: false,
    })
  }
  return { burst: burstLimiter, sustained: sustainedLimiter }
}

/**
 * Decode a Supabase JWT from any sb-*-auth-token cookie to get the user ID.
 * We deliberately skip signature verification here — the Edge runtime has no
 * access to the Supabase JWT secret, and rate-limiting by an unverified sub is
 * acceptable: the actual auth check happens inside the API route.
 */
function extractUserId(request: NextRequest): string | null {
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith('sb-') && cookie.name.endsWith('-auth-token')) {
      try {
        const parts = cookie.value.split('.')
        if (parts.length !== 3) continue
        const payload = JSON.parse(atob(parts[1]))
        if (payload?.sub) return payload.sub as string
      } catch {
        // malformed cookie — fall through
      }
    }
  }
  return null
}

export async function middleware(request: NextRequest) {
  const limiters = getLimiters()
  if (!limiters) return NextResponse.next() // Upstash not configured — pass through

  const userId = extractUserId(request)
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'anonymous'

  // Prefer user ID so per-account limits survive IP changes (VPN, mobile).
  // Fall back to IP for unauthenticated requests.
  const identifier = userId ?? `ip:${ip}`

  // Run both windows in parallel — fail fast on either
  const [burst, sustained] = await Promise.all([
    limiters.burst.limit(identifier),
    limiters.sustained.limit(identifier),
  ])

  const headers: Record<string, string> = {
    'X-RateLimit-Burst-Remaining':     String(burst.remaining),
    'X-RateLimit-Sustained-Remaining': String(sustained.remaining),
  }

  if (!burst.success || !sustained.success) {
    // Show the longer wait if the hourly window is the binding constraint
    const blocked  = !burst.success ? burst : sustained
    const isBurst  = !burst.success && sustained.success
    const retryAfter = Math.max(1, Math.ceil((blocked.reset - Date.now()) / 1000))

    const message = isBurst
      ? 'Submitting too fast — wait a moment before trying again.'
      : 'You\'ve used your review quota for this hour. Come back soon!'

    return NextResponse.json(
      { error: 'rate_limited', message, retryAfter },
      {
        status: 429,
        headers: { ...headers, 'Retry-After': String(retryAfter) },
      },
    )
  }

  const response = NextResponse.next()
  for (const [k, v] of Object.entries(headers)) response.headers.set(k, v)
  return response
}

export const config = {
  matcher: ['/api/review'],
}
