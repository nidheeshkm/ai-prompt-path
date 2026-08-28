import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/server/verify-admin'
import { createAdminClient } from '@/server/supabase-admin'

const VALID_STATUSES = ['acknowledged', 'resolved', 'dismissed'] as const

export async function POST(request: NextRequest) {
  const verified = await verifyAdminRequest(request)
  if (!verified) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { ticketId, status, note } = await request.json() as {
    ticketId: string
    status: typeof VALID_STATUSES[number]
    note?: string
  }

  if (!ticketId || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'invalid payload' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: ticket } = await admin
    .from('support_tickets')
    .select('id, type, status')
    .eq('id', ticketId)
    .in('type', ['feedback', 'bug'])
    .single()

  if (!ticket) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (ticket.status !== 'pending') return NextResponse.json({ error: 'already resolved' }, { status: 409 })

  const { error } = await admin.from('support_tickets').update({
    status,
    admin_note:  note?.trim() || null,
    resolved_by: verified.userId,
  }).eq('id', ticketId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
