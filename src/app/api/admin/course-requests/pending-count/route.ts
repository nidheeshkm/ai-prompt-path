import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/server/verify-admin'
import { createAdminClient } from '@/server/supabase-admin'

export async function GET(request: NextRequest) {
  const verified = await verifyAdminRequest(request)
  if (!verified) return NextResponse.json({ count: 0 })

  const admin = createAdminClient()
  const { count } = await admin
    .from('course_requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')

  return NextResponse.json({ count: count ?? 0 })
}
