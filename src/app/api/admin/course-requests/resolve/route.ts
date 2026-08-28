import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/server/verify-admin'
import { createAdminClient } from '@/server/supabase-admin'

export async function POST(request: NextRequest) {
  const verified = await verifyAdminRequest(request)
  if (!verified) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { requestId, action, note } = await request.json() as {
    requestId: string
    action: 'noted' | 'rejected'
    note?: string
  }

  if (!requestId || !['noted', 'rejected'].includes(action)) {
    return NextResponse.json({ error: 'invalid payload' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('course_requests')
    .update({ status: action, admin_note: note?.trim() || null })
    .eq('id', requestId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
