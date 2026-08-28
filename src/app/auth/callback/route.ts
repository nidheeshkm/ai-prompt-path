import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendWelcomeEmail } from '@/server/email'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    )
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Send welcome email if this is a fresh email-verified signup.
      // We detect this by checking that the account was created within the last 10 minutes
      // (the user signed up and immediately clicked the confirmation link).
      const createdAt = new Date(data.user.created_at).getTime()
      const isNewSignup =
        data.user.email_confirmed_at != null &&
        Date.now() - createdAt < 10 * 60 * 1000

      if (isNewSignup && data.user.email) {
        const userName =
          data.user.user_metadata?.display_name ||
          data.user.user_metadata?.full_name ||
          data.user.email.split('@')[0] ||
          'there'
        sendWelcomeEmail(data.user.email, userName).catch(() => {})
      }

      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`)
}
