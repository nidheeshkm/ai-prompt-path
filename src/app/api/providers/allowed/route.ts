import { NextResponse } from 'next/server'
import { createAdminClient } from '@/server/supabase-admin'
import { PROVIDERS } from '@/lib/providers'

export async function GET() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('global_settings')
    .select('value')
    .eq('key', 'allowed_providers')
    .single()

  const allowed: string[] = data?.value ?? PROVIDERS
  return NextResponse.json({ allowed })
}
