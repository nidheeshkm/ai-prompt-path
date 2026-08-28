import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/server/verify-admin'
import { createAdminClient } from '@/server/supabase-admin'
import { sendBlockedEmail, sendUnblockApprovedEmail } from '@/server/email'

export async function POST(request: NextRequest) {
  const verified = await verifyAdminRequest(request)
  if (!verified) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { userId, block } = await request.json() as { userId: string; block: boolean }
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const admin = createAdminClient()

  const { error } = await admin
    .from('profiles')
    .update({ is_blocked: block })
    .eq('id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const [{ data: targetProfile }, { data: authUser }] = await Promise.all([
    admin.from('profiles').select('display_name').eq('id', userId).single(),
    admin.auth.admin.getUserById(userId),
  ])
  const userEmail = authUser?.user?.email
  const userName  = targetProfile?.display_name ?? 'there'

  if (userEmail) {
    if (block) {
      sendBlockedEmail(userEmail, userName).catch(() => {})
    } else {
      sendUnblockApprovedEmail(userEmail, userName).catch(() => {})
    }
  }

  return NextResponse.json({ ok: true })
}
