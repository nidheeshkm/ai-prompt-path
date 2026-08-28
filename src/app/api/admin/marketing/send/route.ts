import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/server/verify-admin'
import { createAdminClient } from '@/server/supabase-admin'
import { sendEmail } from '@/server/email'
import { resolveAudience } from '../audience/route'
import type { AudienceGroup } from '../audience/route'

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')

function buildHtml(subject: string, body: string): string {
  // Convert plain-text line breaks to <br>, linkify URLs
  const escaped = body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  const withBreaks = escaped.replace(/\n/g, '<br>')

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
      <tr><td style="background:#f59e0b;padding:28px 32px;">
        <p style="margin:0;font-size:20px;font-weight:700;color:#fff;">PromptPath</p>
      </td></tr>
      <tr><td style="padding:32px;">
        <p style="margin:0 0 20px;font-size:22px;font-weight:700;color:#0f172a;">${subject}</p>
        <div style="font-size:15px;color:#475569;line-height:1.7;">${withBreaks}</div>
        <div style="margin-top:28px;">
          <a href="${APP_URL}/dashboard" style="display:inline-block;background:#f59e0b;color:#fff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:10px;">Go to PromptPath →</a>
        </div>
      </td></tr>
      <tr><td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;">
        <p style="margin:0;font-size:12px;color:#94a3b8;">© PromptPath · You're receiving this as a registered learner.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`
}

export async function POST(request: NextRequest) {
  const verified = await verifyAdminRequest(request)
  if (!verified) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { group, subject, body } = await request.json() as {
    group: AudienceGroup
    subject: string
    body: string
  }

  if (!group || !subject?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'group, subject, and body are required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const audience = await resolveAudience(group, admin)

  if (audience.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, skipped: 0 })
  }

  const html = buildHtml(subject.trim(), body.trim())

  let sent = 0
  let failed = 0

  // Send in sequence — SMTP servers rate-limit concurrent connections
  for (const recipient of audience) {
    const personalised = html.replace(/>PromptPath<\/p>/, `>PromptPath</p>`) // brand stays consistent
    const result = await sendEmail(recipient.email, subject.trim(), personalised)
    if (result.ok) sent++
    else failed++
    // Small delay to stay within SMTP rate limits
    await new Promise(r => setTimeout(r, 100))
  }

  return NextResponse.json({ sent, failed, total: audience.length })
}
