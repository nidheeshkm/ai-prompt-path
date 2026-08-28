import 'server-only'
import nodemailer from 'nodemailer'

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')

function createTransport() {
  const user = process.env.EMAIL_USER
  const pass = process.env.EMAIL_PASS
  if (!user || !pass) return null

  return nodemailer.createTransport({
    host: process.env.EMAIL_SMTP_HOST ?? 'smtp.gmail.com',
    port: Number(process.env.EMAIL_SMTP_PORT ?? 587),
    secure: false, // STARTTLS
    auth: { user, pass },
  })
}

// ── Generic send ─────────────────────────────────────────────────────────────

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<{ ok: boolean; error?: string }> {
  const transport = createTransport()
  if (!transport) return { ok: false, error: 'EMAIL_USER / EMAIL_PASS not configured' }

  const from = process.env.EMAIL_FROM ?? process.env.EMAIL_USER!
  try {
    await transport.sendMail({ from, to, subject, html })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

// ── Typed email functions ─────────────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, userName: string) {
  return sendEmail(
    to,
    'Welcome to PromptPath 🎉',
    `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
      <tr><td style="background:#f59e0b;padding:28px 32px;">
        <p style="margin:0;font-size:20px;font-weight:700;color:#fff;">PromptPath</p>
      </td></tr>
      <tr><td style="padding:32px;">
        <p style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0f172a;">Welcome, ${userName}! 👋</p>
        <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6;">
          Your email is confirmed and your account is ready. PromptPath helps you master AI and prompt engineering through hands-on challenges, instant AI feedback, and milestone-based progress.
        </p>

        <div style="background:#fefce8;border:1px solid #fde68a;border-radius:12px;padding:20px 24px;margin:0 0 24px;">
          <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#92400e;">Get started in 3 steps</p>
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:4px 12px 4px 0;vertical-align:top;">
                <span style="display:inline-block;width:20px;height:20px;background:#f59e0b;border-radius:50%;text-align:center;font-size:11px;font-weight:700;color:#fff;line-height:20px;">1</span>
              </td>
              <td style="padding:4px 0;font-size:13px;color:#78350f;line-height:1.5;">
                Go to <strong>Settings</strong> and add a free AI provider key (OpenRouter or Groq — no credit card needed)
              </td>
            </tr>
            <tr>
              <td style="padding:4px 12px 4px 0;vertical-align:top;">
                <span style="display:inline-block;width:20px;height:20px;background:#f59e0b;border-radius:50%;text-align:center;font-size:11px;font-weight:700;color:#fff;line-height:20px;">2</span>
              </td>
              <td style="padding:4px 0;font-size:13px;color:#78350f;line-height:1.5;">
                Browse <strong>Courses</strong> and enroll in a track that matches your goals
              </td>
            </tr>
            <tr>
              <td style="padding:4px 12px 4px 0;vertical-align:top;">
                <span style="display:inline-block;width:20px;height:20px;background:#f59e0b;border-radius:50%;text-align:center;font-size:11px;font-weight:700;color:#fff;line-height:20px;">3</span>
              </td>
              <td style="padding:4px 0;font-size:13px;color:#78350f;line-height:1.5;">
                Complete topics to earn XP, unlock milestones, and earn certificates
              </td>
            </tr>
          </table>
        </div>

        <a href="${APP_URL}/dashboard" style="display:inline-block;background:#f59e0b;color:#fff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:10px;">Go to Dashboard →</a>
      </td></tr>
      <tr><td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;">
        <p style="margin:0;font-size:12px;color:#94a3b8;">© PromptPath · You're receiving this because you just created an account.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`,
  )
}

export async function sendUnblockApprovedEmail(
  to: string,
  userName: string,
  adminNote?: string | null,
) {
  return sendEmail(
    to,
    'Your PromptPath account has been reinstated',
    `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
      <tr><td style="background:#f59e0b;padding:28px 32px;">
        <p style="margin:0;font-size:20px;font-weight:700;color:#fff;">PromptPath</p>
      </td></tr>
      <tr><td style="padding:32px;">
        <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">Account reinstated ✓</p>
        <p style="margin:0 0 20px;font-size:15px;color:#475569;">Hi ${userName},</p>
        <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6;">
          Good news — your unblock request has been reviewed and approved. Your account is now active and you can sign in immediately.
        </p>
        ${adminNote ? `
        <div style="background:#f1f5f9;border-left:3px solid #f59e0b;border-radius:0 8px 8px 0;padding:14px 16px;margin:0 0 24px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;">Admin note</p>
          <p style="margin:0;font-size:14px;color:#334155;">${adminNote}</p>
        </div>` : ''}
        <a href="${APP_URL}/auth/login" style="display:inline-block;background:#f59e0b;color:#fff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:10px;">Sign in to PromptPath →</a>
      </td></tr>
      <tr><td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;">
        <p style="margin:0;font-size:12px;color:#94a3b8;">© PromptPath · Sent because you submitted an unblock request.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`,
  )
}

export async function sendBlockedEmail(
  to: string,
  userName: string,
) {
  return sendEmail(
    to,
    'Your PromptPath account has been suspended',
    `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
      <tr><td style="background:#ef4444;padding:28px 32px;">
        <p style="margin:0;font-size:20px;font-weight:700;color:#fff;">PromptPath</p>
      </td></tr>
      <tr><td style="padding:32px;">
        <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">Account suspended</p>
        <p style="margin:0 0 20px;font-size:15px;color:#475569;">Hi ${userName},</p>
        <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
          Your PromptPath account has been suspended by an administrator. You will not be able to access the platform until the suspension is reviewed.
        </p>

        <!-- How to request unblock -->
        <div style="background:#fefce8;border:1px solid #fde68a;border-radius:12px;padding:20px 24px;margin:0 0 24px;">
          <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#92400e;">How to request a review</p>
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:4px 12px 4px 0;vertical-align:top;">
                <span style="display:inline-block;width:20px;height:20px;background:#f59e0b;border-radius:50%;text-align:center;font-size:11px;font-weight:700;color:#fff;line-height:20px;">1</span>
              </td>
              <td style="padding:4px 0;font-size:13px;color:#78350f;line-height:1.5;">
                Sign in to your account at the link below
              </td>
            </tr>
            <tr>
              <td style="padding:4px 12px 4px 0;vertical-align:top;">
                <span style="display:inline-block;width:20px;height:20px;background:#f59e0b;border-radius:50%;text-align:center;font-size:11px;font-weight:700;color:#fff;line-height:20px;">2</span>
              </td>
              <td style="padding:4px 0;font-size:13px;color:#78350f;line-height:1.5;">
                You'll see an "Account Suspended" page — click <strong>Submit Request</strong>
              </td>
            </tr>
            <tr>
              <td style="padding:4px 12px 4px 0;vertical-align:top;">
                <span style="display:inline-block;width:20px;height:20px;background:#f59e0b;border-radius:50%;text-align:center;font-size:11px;font-weight:700;color:#fff;line-height:20px;">3</span>
              </td>
              <td style="padding:4px 0;font-size:13px;color:#78350f;line-height:1.5;">
                Explain why your account should be reinstated — be specific
              </td>
            </tr>
            <tr>
              <td style="padding:4px 12px 4px 0;vertical-align:top;">
                <span style="display:inline-block;width:20px;height:20px;background:#f59e0b;border-radius:50%;text-align:center;font-size:11px;font-weight:700;color:#fff;line-height:20px;">4</span>
              </td>
              <td style="padding:4px 0;font-size:13px;color:#78350f;line-height:1.5;">
                An administrator will review your request and email you the outcome
              </td>
            </tr>
          </table>
        </div>

        <a href="${APP_URL}/auth/login" style="display:inline-block;background:#0f172a;color:#fff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:10px;">Sign in to submit a request →</a>
      </td></tr>
      <tr><td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;">
        <p style="margin:0;font-size:12px;color:#94a3b8;">© PromptPath · If you believe this suspension is a mistake, please follow the steps above.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`,
  )
}

export async function sendUnblockRejectedEmail(
  to: string,
  userName: string,
  adminNote?: string | null,
) {
  return sendEmail(
    to,
    'Update on your PromptPath unblock request',
    `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
      <tr><td style="background:#64748b;padding:28px 32px;">
        <p style="margin:0;font-size:20px;font-weight:700;color:#fff;">PromptPath</p>
      </td></tr>
      <tr><td style="padding:32px;">
        <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">Request update</p>
        <p style="margin:0 0 20px;font-size:15px;color:#475569;">Hi ${userName},</p>
        <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6;">
          Your unblock request has been reviewed. Unfortunately, we are unable to reinstate your account at this time.
        </p>
        ${adminNote ? `
        <div style="background:#f1f5f9;border-left:3px solid #e2e8f0;border-radius:0 8px 8px 0;padding:14px 16px;margin:0 0 24px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;">Admin note</p>
          <p style="margin:0;font-size:14px;color:#334155;">${adminNote}</p>
        </div>` : ''}
        <p style="margin:0;font-size:13px;color:#94a3b8;">If you believe this is incorrect, please contact our support team.</p>
      </td></tr>
      <tr><td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;">
        <p style="margin:0;font-size:12px;color:#94a3b8;">© PromptPath · Sent because you submitted an unblock request.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`,
  )
}
