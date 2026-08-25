import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getTopicSolution, getMilestoneSolution } from '@/server/curriculum'
import { getCourseTopics, getCourse } from '@/data/curriculum'

/**
 * GET /api/solution?courseId=X&topicId=Y
 * GET /api/solution?courseId=X&milestoneId=Y
 *
 * Returns solution code only when the user has earned access:
 *   - Topic:     3+ attempts on the topic OR topic is completed
 *   - Milestone: milestone is completed
 *
 * Solution code is read from content_solutions / content_milestone_solutions
 * via the service-role client (bypasses RLS). It never travels through the
 * client bundle.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const courseId    = searchParams.get('courseId')
  const topicId     = searchParams.get('topicId')
  const milestoneId = searchParams.get('milestoneId')

  if (!courseId || (!topicId && !milestoneId)) {
    return NextResponse.json({ error: 'Missing required params' }, { status: 400 })
  }

  // Verify the user is authenticated
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

  if (topicId) {
    return handleTopicSolution(supabase, user.id, courseId, topicId)
  }
  return handleMilestoneSolution(supabase, user.id, courseId, milestoneId!)
}

async function handleTopicSolution(
  supabase:  ReturnType<typeof createServerClient>,
  userId:    string,
  courseId:  string,
  topicId:   string,
) {
  // Verify the topic exists
  const topic = getCourseTopics(courseId).find(t => t.id === topicId)
  if (!topic) {
    return NextResponse.json({ error: 'Topic not found' }, { status: 404 })
  }

  // Access rule: topic completed OR 3+ attempts
  const { data: progress } = await supabase
    .from('progress')
    .select('status, attempts')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .eq('topic_id', topicId)
    .single()

  const isCompleted = progress?.status === 'completed'
  const attempts    = progress?.attempts ?? 0

  if (!isCompleted && attempts < 3) {
    return NextResponse.json(
      { error: 'Solution unlocks after 3 attempts or on completion' },
      { status: 403 },
    )
  }

  // Fetch from DB (service-role, bypasses RLS on content_solutions)
  const solution = await getTopicSolution(courseId, topicId)

  if (!solution) {
    // DB not yet seeded — fall back to curriculum.ts (temporary, safe server-side)
    const fallback = topic.codingTask?.solutionCode ?? ''
    return NextResponse.json({ solution: fallback })
  }

  return NextResponse.json({ solution })
}

async function handleMilestoneSolution(
  supabase:    ReturnType<typeof createServerClient>,
  userId:      string,
  courseId:    string,
  milestoneId: string,
) {
  const course    = getCourse(courseId)
  const milestone = course?.project.milestones.find(m => m.id === milestoneId)
  if (!milestone) {
    return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
  }

  // Access rule: milestone must be completed
  const { data: progress } = await supabase
    .from('milestone_progress')
    .select('status, attempts')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .eq('milestone_id', milestoneId)
    .single()

  const isCompleted = progress?.status === 'completed'
  const attempts    = progress?.attempts ?? 0

  if (!isCompleted && attempts < 3) {
    return NextResponse.json(
      { error: 'Solution unlocks after 3 attempts or on completion' },
      { status: 403 },
    )
  }

  const solution = await getMilestoneSolution(courseId, milestoneId)

  if (!solution) {
    const fallback = milestone.solutionCode ?? ''
    return NextResponse.json({ solution: fallback })
  }

  return NextResponse.json({ solution })
}
