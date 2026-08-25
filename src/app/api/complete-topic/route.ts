import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getCourse, getCourseTopics } from '@/data/curriculum'

export async function POST(request: Request) {
  try {
    const { courseId, topicId, score, submission } = await request.json()

    if (!courseId || !topicId || typeof score !== 'number') {
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

    // Topic XP is resolved server-side — curriculum is never imported by this route's
    // client bundle because API routes are server-only modules.
    const topic = getCourseTopics(courseId).find(t => t.id === topicId)
    if (!topic) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 })
    }

    // ── Atomic write ──────────────────────────────────────────────────────────
    // progress + profile updated in a single Postgres transaction via SECURITY
    // DEFINER function. FOR UPDATE + advisory lock prevent concurrent XP grants.
    const { data: result, error: rpcError } = await supabase.rpc('complete_topic_atomic', {
      p_user_id:    user.id,
      p_course_id:  courseId,
      p_topic_id:   topicId,
      p_score:      score,
      p_submission: submission ?? null,
      p_topic_xp:   topic.xp,
    })

    if (rpcError) {
      console.error('[complete-topic] RPC error:', rpcError.message)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    const {
      already_completed,
      xp_earned,
      new_xp,
      new_level,
      new_streak,
      new_longest_streak,
      attempts,
    } = result as {
      already_completed:  boolean
      xp_earned:          number
      new_xp:             number
      new_level:          number
      new_streak:         number
      new_longest_streak: number
      attempts:           number
    }

    // ── Badge awarding (best-effort, idempotent) ──────────────────────────────
    // Runs after the atomic write so it sees the committed state.
    // Each badge upsert uses ON CONFLICT DO NOTHING — partial failures leave the
    // user without that badge but don't corrupt XP.
    if (!already_completed) {
      await awardTopicBadges(supabase, user.id, courseId, topicId, score, attempts, new_streak)
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
    console.error('[complete-topic] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function awardTopicBadges(
  supabase: ReturnType<typeof createServerClient>,
  userId:   string,
  courseId: string,
  topicId:  string,
  score:    number,
  attempts: number,
  streak:   number,
) {
  const badges: string[] = []

  // first_lesson — fires when total completed topics (platform-wide) reaches exactly 1
  const { count: totalCount } = await supabase
    .from('progress')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'completed')

  if ((totalCount ?? 0) === 1) badges.push('first_lesson')
  if ((totalCount ?? 0) >= 40) badges.push('halfway')

  // Chapter completion badge
  const chapterNum = parseInt(topicId.split('.')[0])
  const course = getCourse(courseId)
  if (course) {
    const chapter = course.chapters.find(c => c.id === chapterNum)
    if (chapter) {
      const { data: courseProgress } = await supabase
        .from('progress')
        .select('topic_id')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .eq('status', 'completed')

      const completedIds = new Set(courseProgress?.map((p: { topic_id: string }) => p.topic_id) ?? [])

      if (chapter.topics.every(t => completedIds.has(t.id))) {
        badges.push(`chapter_${courseId}_${chapterNum}`)
      }

      const allTopics = getCourseTopics(courseId)
      if (allTopics.every(t => completedIds.has(t.id))) {
        badges.push(`course_complete_${courseId}`)
      }
    }
  }

  if (score === 100) badges.push('perfect_quiz')
  if (attempts === 1 && score >= 70) badges.push('first_try')
  if (streak >= 3)  badges.push('streak_3')
  if (streak >= 7)  badges.push('streak_7')
  if (streak >= 14) badges.push('streak_14')
  if (streak >= 30) badges.push('streak_30')

  if (badges.length === 0) return

  // Insert all badges in one call; ON CONFLICT is handled server-side by upsert
  await Promise.allSettled(
    badges.map(badge =>
      supabase.from('badges').upsert(
        { user_id: userId, badge_type: badge, earned_at: new Date().toISOString() },
        { onConflict: 'user_id,badge_type' },
      )
    )
  )
}
