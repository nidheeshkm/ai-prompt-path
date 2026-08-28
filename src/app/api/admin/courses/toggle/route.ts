import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/server/verify-admin'
import { createAdminClient } from '@/server/supabase-admin'

export async function POST(request: NextRequest) {
  const verified = await verifyAdminRequest(request)
  if (!verified) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { courseId, active } = await request.json()
  if (!courseId || typeof active !== 'boolean') {
    return NextResponse.json({ error: 'courseId and active required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('course_settings')
    .upsert(
      { course_id: courseId, is_active: active, updated_at: new Date().toISOString() },
      { onConflict: 'course_id' },
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
