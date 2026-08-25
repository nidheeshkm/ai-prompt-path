import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getCourse, getCourseTopics } from '@/data/curriculum'

export async function POST(request: Request) {
  try {
    const { courseId, milestoneId, score } = await request.json()

    if (!courseId || !milestoneId || typeof score !== 'number') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } },
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const course = getCourse(courseId)
    const milestone = course?.project.milestones.find(m => m.id === milestoneId)
    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
    }

    // ── Atomic write ──────────────────────────────────────────────────────────
    const { data: result, error: rpcError } = await supabase.rpc('complete_milestone_atomic', {
      p_user_id:      user.id,
      p_course_id:    courseId,
      p_milestone_id: milestoneId,
      p_score:        score,
      p_milestone_xp: milestone.xp,
    })

    if (rpcError) {
      console.error('[complete-milestone] RPC error:', rpcError.message)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    const {
      already_completed,
      xp_earned,
      new_xp,
      new_level,
      new_streak,
      new_longest_streak,
    } = result as {
      already_completed:  boolean
      xp_earned:          number
      new_xp:             number
      new_level:          number
      new_streak:         number
      new_longest_streak: number
    }

    // ── Course completion check (best-effort) ─────────────────────────────────
    if (!already_completed && course) {
      await checkCourseCompletion(supabase, user.id, courseId, course)
    }

    return NextResponse.json({
      xpEarned:         xp_earned,
      newXp:            new_xp,
      newLevel:         new_level,
      newStreak:        new_streak,
      newLongestStreak: new_longest_streak,
      alreadyCompleted: already_completed,
    })
  } catch (err) {
    console.error('[complete-milestone] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function checkCourseCompletion(
  supabase:  ReturnType<typeof createServerClient>,
  userId:    string,
  courseId:  string,
  course:    NonNullable<ReturnType<typeof getCourse>>,
) {
  const allTopicIds     = getCourseTopics(courseId).map(t => t.id)
  const allMilestoneIds = course.project.milestones.map(m => m.id)

  const [{ data: topicData }, { data: milestoneData }] = await Promise.all([
    supabase
      .from('progress')
      .select('topic_id')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .eq('status', 'completed'),
    supabase
      .from('milestone_progress')
      .select('milestone_id')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .eq('status', 'completed'),
  ])

  const completedTopics     = new Set(topicData?.map((p: { topic_id: string }) => p.topic_id) ?? [])
  const completedMilestones = new Set(milestoneData?.map((m: { milestone_id: string }) => m.milestone_id) ?? [])

  const allTopicsDone     = allTopicIds.every(id => completedTopics.has(id))
  const allMilestonesDone = allMilestoneIds.every(id => completedMilestones.has(id))

  if (!allTopicsDone || !allMilestonesDone) return

  await Promise.allSettled([
    supabase.from('certificates').upsert(
      { user_id: userId, course_id: courseId },
      { onConflict: 'user_id,course_id' },
    ),
    supabase.from('badges').upsert(
      { user_id: userId, badge_type: `cert_${courseId}`, earned_at: new Date().toISOString() },
      { onConflict: 'user_id,badge_type' },
    ),
    supabase
      .from('enrollments')
      .update({ completed_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('course_id', courseId),
  ])
}
