import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/server/verify-admin'
import { createAdminClient } from '@/server/supabase-admin'
import { PROVIDERS } from '@/lib/providers'
import type { Provider } from '@/lib/providers'

export async function POST(request: NextRequest) {
  const verified = await verifyAdminRequest(request)
  if (!verified) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { provider, enabled } = await request.json()
  if (!PROVIDERS.includes(provider as Provider) || typeof enabled !== 'boolean') {
    return NextResponse.json({ error: 'Invalid provider or enabled flag' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: setting } = await admin
    .from('global_settings')
    .select('value')
    .eq('key', 'allowed_providers')
    .single()

  const current: string[] = setting?.value ?? PROVIDERS
  const updated = enabled
    ? [...new Set([...current, provider])]
    : current.filter((p: string) => p !== provider)

  const { error } = await admin
    .from('global_settings')
    .upsert(
      { key: 'allowed_providers', value: updated, updated_at: new Date().toISOString() },
      { onConflict: 'key' },
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
