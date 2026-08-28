import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/server/supabase-admin'

/**
 * Decode user ID from the Supabase session cookie.
 * @supabase/ssr v0.5+ format: "base64-<base64(sessionJSON)>"
 * Legacy fallback: raw JWT "header.payload.signature"
 */
function getUserIdFromCookies(request: NextRequest): string | null {
  for (const cookie of request.cookies.getAll()) {
    if (!cookie.name.startsWith('sb-') || !cookie.name.includes('-auth-token')) continue
    try {
      const { value } = cookie

      if (value.startsWith('base64-')) {
        const json = JSON.parse(atob(value.slice('base64-'.length)))
        const id = json?.user?.id
        if (id) return id as string
        continue
      }

      const parts = value.split('.')
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]))
        if (payload?.sub) return payload.sub as string
      }
    } catch {
      // malformed — try next
    }
  }
  return null
}

export async function POST(request: NextRequest) {
  const userId = getUserIdFromCookies(request)
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const [{ data: authUser }, { data: profile }] = await Promise.all([
    admin.auth.admin.getUserById(userId),
    admin.from('profiles').select('is_admin').eq('id', userId).single(),
  ])

  if (!authUser?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!profile?.is_admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const response = NextResponse.json({ ok: true })
  response.cookies.set('admin_access', userId, {
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 1800,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  })
  return response
}
