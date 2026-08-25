import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/server/supabase-admin'
import { encryptApiKey } from '@/server/crypto'
import { PROVIDERS } from '@/lib/providers'
import type { Provider } from '@/lib/providers'

async function getUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// POST /api/keys  { provider, key }  — encrypt and store a provider key
export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { provider, key } = await request.json()

  if (!PROVIDERS.includes(provider as Provider) || typeof key !== 'string' || !key.trim()) {
    return NextResponse.json({ error: 'Invalid provider or key' }, { status: 400 })
  }

  const admin = createAdminClient()
  const encrypted = await encryptApiKey(key.trim())

  const { error } = await admin
    .from('provider_keys')
    .upsert(
      { user_id: user.id, provider, encrypted_key: encrypted, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,provider' },
    )

  if (error) {
    console.error('[/api/keys POST] upsert error:', error.message)
    return NextResponse.json({ error: 'Failed to save key' }, { status: 500 })
  }

  // Auto-set as active provider if the user has none yet
  const { data: profile } = await admin
    .from('profiles')
    .select('active_provider')
    .eq('id', user.id)
    .single()

  if (!profile?.active_provider) {
    await admin.from('profiles').update({ active_provider: provider }).eq('id', user.id)
  }

  return NextResponse.json({ ok: true })
}

// DELETE /api/keys  { provider }  — remove a provider key and its vault secret
export async function DELETE(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { provider } = await request.json()

  if (!PROVIDERS.includes(provider as Provider)) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { error } = await admin
    .from('provider_keys')
    .delete()
    .eq('user_id', user.id)
    .eq('provider', provider)

  if (error) {
    console.error('[/api/keys DELETE] delete error:', error.message)
    return NextResponse.json({ error: 'Failed to remove key' }, { status: 500 })
  }

  // If the deleted provider was active, switch to the next configured one (or null)
  const { data: profile } = await admin
    .from('profiles')
    .select('active_provider')
    .eq('id', user.id)
    .single()

  if (profile?.active_provider === provider) {
    const { data: remaining } = await admin
      .from('provider_keys')
      .select('provider')
      .eq('user_id', user.id)

    const next = (remaining ?? []).find(r => r.provider !== provider)?.provider ?? null
    await admin.from('profiles').update({ active_provider: next }).eq('id', user.id)
  }

  return NextResponse.json({ ok: true })
}

// PATCH /api/keys  { provider }  — set active provider
export async function PATCH(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { provider } = await request.json()

  if (!PROVIDERS.includes(provider as Provider)) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Verify the user actually has a key for this provider before setting it active
  const { data: row } = await admin
    .from('provider_keys')
    .select('id')
    .eq('user_id', user.id)
    .eq('provider', provider)
    .single()

  if (!row) {
    return NextResponse.json({ error: 'No key configured for this provider' }, { status: 400 })
  }

  await admin.from('profiles').update({ active_provider: provider }).eq('id', user.id)
  return NextResponse.json({ ok: true })
}
