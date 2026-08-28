import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/server/supabase-admin'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // Confirm the user is actually blocked before accepting the ticket
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('is_blocked').eq('id', user.id).single()
  if (!profile?.is_blocked) return NextResponse.json({ error: 'not_blocked' }, { status: 400 })

  const { message } = await request.json() as { message: string }
  if (!message?.trim()) return NextResponse.json({ error: 'message required' }, { status: 400 })

  // Check for existing pending ticket from this user (prevent spam)
  const { data: existing } = await admin
    .from('support_tickets')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) return NextResponse.json({ error: 'already_pending' }, { status: 409 })

  const { error } = await admin.from('support_tickets').insert({
    user_id: user.id,
    type: 'unblock_request',
    message: message.trim(),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
