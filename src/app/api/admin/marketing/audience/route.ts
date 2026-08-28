import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/server/verify-admin'
import { createAdminClient } from '@/server/supabase-admin'

export type AudienceGroup =
  | 'not_enrolled'
  | 'enrolled_not_started'
  | 'inactive_signup'
  | 'missing_streak'
  | 'all_active'

async function resolveAudience(
  group: AudienceGroup,
  admin: ReturnType<typeof createAdminClient>,
): Promise<{ id: string; email: string; name: string }[]> {
  // Fetch all auth users once — we need emails
  const { data: authData } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const authUsers = authData?.users ?? []

  // Build maps: id → email, id → last_sign_in_at, id → created_at
  const emailMap: Record<string, string> = {}
  const lastSignInMap: Record<string, Date | null> = {}
  const createdAtMap: Record<string, Date> = {}
  for (const u of authUsers) {
    if (u.email) emailMap[u.id] = u.email
    lastSignInMap[u.id] = u.last_sign_in_at ? new Date(u.last_sign_in_at) : null
    createdAtMap[u.id] = new Date(u.created_at)
  }

  // Fetch non-admin, non-blocked profiles
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, display_name, xp, last_activity_date')
    .eq('is_admin', false)
    .eq('is_blocked', false)

  const allProfiles = profiles ?? []
  const allIds = allProfiles.map(p => p.id)

  function toResult(ids: string[]) {
    return ids
      .filter(id => emailMap[id])
      .map(id => {
        const p = allProfiles.find(x => x.id === id)
        return { id, email: emailMap[id], name: p?.display_name ?? 'there' }
      })
  }

  if (group === 'all_active') {
    return toResult(allIds)
  }

  if (group === 'not_enrolled') {
    const { data: enrolledRows } = await admin
      .from('enrollments')
      .select('user_id')
    const enrolledIds = new Set((enrolledRows ?? []).map(r => r.user_id))
    return toResult(allIds.filter(id => !enrolledIds.has(id)))
  }

  if (group === 'enrolled_not_started') {
    const { data: enrolledRows } = await admin
      .from('enrollments')
      .select('user_id')
    const enrolledIds = new Set((enrolledRows ?? []).map(r => r.user_id))

    // Users who have progress with status in_progress or completed have "started"
    const { data: startedRows } = await admin
      .from('progress')
      .select('user_id')
      .in('status', ['in_progress', 'completed'])
    const startedIds = new Set((startedRows ?? []).map(r => r.user_id))

    return toResult(allIds.filter(id => enrolledIds.has(id) && !startedIds.has(id)))
  }

  if (group === 'inactive_signup') {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    // Account created > 3 days ago AND (never signed in again after the initial session)
    // Heuristic: last_sign_in_at within 24h of created_at means they never came back
    return toResult(
      allIds.filter(id => {
        const created = createdAtMap[id]
        if (!created || created > threeDaysAgo) return false
        const lastSignIn = lastSignInMap[id]
        if (!lastSignIn) return true
        return lastSignIn.getTime() - created.getTime() < 24 * 60 * 60 * 1000
      }),
    )
  }

  if (group === 'missing_streak') {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    // Has some XP (started learning) but last_activity_date is > 3 days ago or null
    const { data: enrolledRows } = await admin
      .from('enrollments')
      .select('user_id')
    const enrolledIds = new Set((enrolledRows ?? []).map(r => r.user_id))

    return toResult(
      allProfiles
        .filter(p => {
          if (!enrolledIds.has(p.id)) return false
          if ((p.xp ?? 0) === 0) return false
          if (!p.last_activity_date) return true
          return new Date(p.last_activity_date) < threeDaysAgo
        })
        .map(p => p.id),
    )
  }

  return []
}

export async function GET(request: NextRequest) {
  const verified = await verifyAdminRequest(request)
  if (!verified) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const group = new URL(request.url).searchParams.get('group') as AudienceGroup | null
  if (!group) return NextResponse.json({ error: 'group required' }, { status: 400 })

  const admin = createAdminClient()
  const audience = await resolveAudience(group, admin)

  return NextResponse.json({
    count: audience.length,
    preview: audience.slice(0, 5).map(u => ({ name: u.name, email: u.email })),
  })
}

// Export for reuse in send route
export { resolveAudience }
