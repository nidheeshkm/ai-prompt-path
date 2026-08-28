import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/server/supabase-admin'

function getUserIdFromRequest(request: NextRequest): string | null {
  for (const cookie of request.cookies.getAll()) {
    if (!cookie.name.startsWith('sb-') || !cookie.name.includes('-auth-token')) continue
    try {
      const { value } = cookie
      if (value.startsWith('base64-')) {
        const json = JSON.parse(atob(value.slice('base64-'.length)))
        if (json?.user?.id) return json.user.id as string
        continue
      }
      const parts = value.split('.')
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]))
        if (payload?.sub) return payload.sub as string
      }
    } catch { /* malformed */ }
  }
  return null
}

export async function POST(request: NextRequest) {
  const userId = getUserIdFromRequest(request)
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { title, description } = await request.json() as { title?: string; description?: string }

  const trimTitle = title?.trim()
  const trimDesc  = description?.trim()

  if (!trimTitle || trimTitle.length < 3) {
    return NextResponse.json({ error: 'Course title is required (min 3 chars).' }, { status: 400 })
  }
  if (!trimDesc || trimDesc.length < 10) {
    return NextResponse.json({ error: 'Please describe what you want to learn (min 10 chars).' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Limit 3 pending requests per user to prevent spam
  const { count } = await admin
    .from('course_requests')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'pending')

  if ((count ?? 0) >= 3) {
    return NextResponse.json(
      { error: 'You already have 3 pending requests. Wait for them to be reviewed.' },
      { status: 429 }
    )
  }

  const { error } = await admin
    .from('course_requests')
    .insert({ user_id: userId, title: trimTitle, description: trimDesc })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
