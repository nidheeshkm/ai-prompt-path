import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/server/supabase-admin'

const MAX_MESSAGE_LEN = 2000
const MAX_FILE_BYTES  = 5 * 1024 * 1024 // 5 MB
const RATE_LIMIT      = 5               // max submissions per 24 h
const VALID_TYPES     = ['feedback', 'bug'] as const
const VALID_CATS      = ['content_error', 'technical_issue', 'ui_problem', 'missing_content', 'other'] as const

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // ── Rate limit: max 5 feedback/bug submissions per 24 h ───────────────────
  const { count } = await admin
    .from('support_tickets')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .in('type', ['feedback', 'bug'])
    .gte('created_at', new Date(Date.now() - 86_400_000).toISOString())

  if ((count ?? 0) >= RATE_LIMIT) {
    return NextResponse.json(
      { error: 'rate_limited', message: `You can submit at most ${RATE_LIMIT} reports per 24 hours.` },
      { status: 429 },
    )
  }

  // ── Parse multipart form ───────────────────────────────────────────────────
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'invalid_form' }, { status: 400 })
  }

  const type       = formData.get('type')?.toString() ?? ''
  const category   = formData.get('category')?.toString() ?? ''
  const message    = formData.get('message')?.toString().trim() ?? ''
  const courseId   = formData.get('courseId')?.toString() ?? null
  const topicId    = formData.get('topicId')?.toString() ?? null
  const screenshot = formData.get('screenshot') instanceof File
    ? formData.get('screenshot') as File
    : null

  // ── Validate ───────────────────────────────────────────────────────────────
  if (!VALID_TYPES.includes(type as typeof VALID_TYPES[number])) {
    return NextResponse.json({ error: 'invalid_type' }, { status: 400 })
  }
  if (category && !VALID_CATS.includes(category as typeof VALID_CATS[number])) {
    return NextResponse.json({ error: 'invalid_category' }, { status: 400 })
  }
  if (!message || message.length > MAX_MESSAGE_LEN) {
    return NextResponse.json(
      { error: 'invalid_message', message: `Message must be 1–${MAX_MESSAGE_LEN} characters.` },
      { status: 400 },
    )
  }
  if (screenshot && screenshot.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'file_too_large', message: 'Screenshot must be under 5 MB.' }, { status: 400 })
  }
  if (screenshot && !screenshot.type.startsWith('image/')) {
    return NextResponse.json({ error: 'invalid_file_type', message: 'Only image files are accepted.' }, { status: 400 })
  }

  // ── Upload screenshot to Supabase Storage (if provided) ────────────────────
  let screenshotUrl: string | null = null
  if (screenshot && screenshot.size > 0) {
    const ext      = screenshot.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png'
    const filename = `${user.id}/${Date.now()}.${ext}`
    const buffer   = Buffer.from(await screenshot.arrayBuffer())

    const { error: uploadError } = await admin.storage
      .from('feedback-screenshots')
      .upload(filename, buffer, { contentType: screenshot.type, upsert: false })

    if (!uploadError) {
      screenshotUrl = filename // store path; signed URL generated on demand in admin
    }
  }

  // ── Insert feedback row ────────────────────────────────────────────────────
  const priority = type === 'bug' ? 'high' : 'normal'

  const { error } = await admin.from('support_tickets').insert({
    user_id:        user.id,
    type,
    category:       category || null,
    message,
    course_id:      courseId,
    topic_id:       topicId,
    screenshot_url: screenshotUrl,
    priority,
    status:         'pending',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
