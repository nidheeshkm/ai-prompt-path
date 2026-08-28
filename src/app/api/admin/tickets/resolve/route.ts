import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/server/verify-admin'
import { createAdminClient } from '@/server/supabase-admin'
import { sendUnblockApprovedEmail, sendUnblockRejectedEmail } from '@/server/email'

export async function POST(request: NextRequest) {
  const verified = await verifyAdminRequest(request)
  if (!verified) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { ticketId, action, note } = await request.json() as {
    ticketId: string
    action: 'approve' | 'reject'
    note?: string
  }

  if (!ticketId || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'invalid payload' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: ticket } = await admin
    .from('support_tickets')
    .select('id, user_id, status')
    .eq('id', ticketId)
    .single()

  if (!ticket) return NextResponse.json({ error: 'ticket not found' }, { status: 404 })
  if (ticket.status !== 'pending') return NextResponse.json({ error: 'already resolved' }, { status: 409 })

  const [{ data: userProfile }, { data: authUser }] = await Promise.all([
    admin.from('profiles').select('display_name').eq('id', ticket.user_id).single(),
    admin.auth.admin.getUserById(ticket.user_id),
  ])

  const userEmail = authUser?.user?.email
  const userName  = userProfile?.display_name ?? 'there'
  const trimmedNote = note?.trim() || null

  await admin.from('support_tickets').update({
    status: action === 'approve' ? 'approved' : 'rejected',
    admin_note: trimmedNote,
    resolved_by: verified.userId,
  }).eq('id', ticketId)

  if (action === 'approve') {
    await admin.from('profiles').update({ is_blocked: false }).eq('id', ticket.user_id)
  }

  if (userEmail) {
    const send = action === 'approve'
      ? sendUnblockApprovedEmail(userEmail, userName, trimmedNote)
      : sendUnblockRejectedEmail(userEmail, userName, trimmedNote)
    send.catch(() => {})
  }

  return NextResponse.json({ ok: true })
}
