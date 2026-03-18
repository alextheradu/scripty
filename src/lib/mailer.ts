import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? 'smtp.example.com',
  port: parseInt(process.env.SMTP_PORT ?? '465', 10),
  secure: process.env.SMTP_SECURE !== 'false', // port 465 = implicit SSL
  auth: {
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS!,
  },
})

const FROM = process.env.SMTP_FROM ?? 'Scripty <noreply@example.com>'
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3009').replace(/\/$/, '')

export async function sendPlatformInvite({
  toEmail,
  inviterName,
}: {
  toEmail: string
  inviterName: string
}) {
  await transporter.sendMail({
    from: FROM,
    to: toEmail,
    subject: `${inviterName} invited you to Scripty`,
    html: platformInviteHtml({ toEmail, inviterName, appUrl: APP_URL }),
    text: platformInviteText({ toEmail, inviterName, appUrl: APP_URL }),
  })
}

export async function sendCollaboratorInvite({
  toEmail,
  toName,
  inviterName,
  scriptTitle,
  scriptId,
  role,
}: {
  toEmail: string
  toName: string
  inviterName: string
  scriptTitle: string
  scriptId: string
  role: string
}) {
  await transporter.sendMail({
    from: FROM,
    to: toEmail,
    subject: `${inviterName} shared "${scriptTitle}" with you on Scripty`,
    html: collaboratorInviteHtml({ toName, inviterName, scriptTitle, scriptId, role, appUrl: APP_URL }),
    text: collaboratorInviteText({ toName, inviterName, scriptTitle, scriptId, role, appUrl: APP_URL }),
  })
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

const baseStyle = `
  font-family: 'Helvetica Neue', Arial, sans-serif;
  background: #0f0f11;
  color: #e8e6de;
  margin: 0; padding: 0;
`

const cardStyle = `
  max-width: 520px;
  margin: 48px auto;
  background: #1a1a1f;
  border: 1px solid #2a2a30;
  border-radius: 12px;
  overflow: hidden;
`

const headerStyle = `
  background: #1a1a1f;
  padding: 32px 40px 24px;
  border-bottom: 1px solid #2a2a30;
`

const bodyStyle = `
  padding: 32px 40px;
`

const btnStyle = `
  display: inline-block;
  background: #e8b86d;
  color: #0f0f11 !important;
  font-family: 'Helvetica Neue', Arial, sans-serif;
  font-weight: 700;
  font-size: 15px;
  text-decoration: none;
  border-radius: 6px;
  padding: 12px 28px;
  margin-top: 24px;
`

const footerStyle = `
  padding: 20px 40px;
  border-top: 1px solid #2a2a30;
  color: #6b6a64;
  font-size: 12px;
`

function wordmark() {
  return `<span style="font-family: Georgia, serif; font-size: 22px; color: #e8b86d; letter-spacing: 0.02em;">Scripty</span>`
}

function platformInviteHtml({ toEmail, inviterName, appUrl }: { toEmail: string; inviterName: string; appUrl: string }) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="${baseStyle}">
  <div style="${cardStyle}">
    <div style="${headerStyle}">
      ${wordmark()}
    </div>
    <div style="${bodyStyle}">
      <p style="margin: 0 0 16px; font-size: 16px; color: #e8e6de;">
        <strong>${escHtml(inviterName)}</strong> has invited <strong>${escHtml(toEmail)}</strong> to join Scripty — a collaborative screenwriting app.
      </p>
      <p style="margin: 0 0 8px; font-size: 14px; color: #6b6a64;">
        Sign in with the Google account associated with this email address to get started.
      </p>
      <a href="${appUrl}/api/auth/signin" style="${btnStyle}">Accept invitation</a>
    </div>
    <div style="${footerStyle}">
      This invite was sent to ${escHtml(toEmail)}. If you weren't expecting this, you can safely ignore it.
    </div>
  </div>
</body></html>`
}

function platformInviteText({ toEmail, inviterName, appUrl }: { toEmail: string; inviterName: string; appUrl: string }) {
  return `${inviterName} has invited ${toEmail} to join Scripty.

Sign in with your Google account at:
${appUrl}/api/auth/signin

If you weren't expecting this, you can safely ignore it.`
}

function collaboratorInviteHtml({
  toName, inviterName, scriptTitle, scriptId, role, appUrl,
}: { toName: string; inviterName: string; scriptTitle: string; scriptId: string; role: string; appUrl: string }) {
  const roleLabel = role === 'viewer' ? 'view' : role === 'admin' ? 'administer' : 'edit'
  const scriptUrl = `${appUrl}/script/${scriptId}`
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="${baseStyle}">
  <div style="${cardStyle}">
    <div style="${headerStyle}">
      ${wordmark()}
    </div>
    <div style="${bodyStyle}">
      <p style="margin: 0 0 16px; font-size: 16px; color: #e8e6de;">
        Hi${toName ? ` <strong>${escHtml(toName)}</strong>` : ''},
      </p>
      <p style="margin: 0 0 16px; font-size: 15px; color: #e8e6de;">
        <strong>${escHtml(inviterName)}</strong> has invited you to ${roleLabel} the script
        <strong>&ldquo;${escHtml(scriptTitle)}&rdquo;</strong> on Scripty.
      </p>
      <table style="width:100%;border-collapse:collapse;margin: 0 0 8px;">
        <tr>
          <td style="padding: 10px 14px; background: #0f0f11; border-radius: 6px; font-size: 14px; color: #6b6a64;">
            Script
          </td>
          <td style="padding: 10px 14px; background: #0f0f11; border-radius: 6px; font-size: 14px; color: #e8e6de;">
            ${escHtml(scriptTitle)}
          </td>
        </tr>
        <tr><td colspan="2" style="height:4px;"></td></tr>
        <tr>
          <td style="padding: 10px 14px; background: #0f0f11; border-radius: 6px; font-size: 14px; color: #6b6a64;">
            Your role
          </td>
          <td style="padding: 10px 14px; background: #0f0f11; border-radius: 6px; font-size: 14px; color: #e8b86d; text-transform: capitalize;">
            ${escHtml(role)}
          </td>
        </tr>
      </table>
      <a href="${scriptUrl}" style="${btnStyle}">Open script</a>
    </div>
    <div style="${footerStyle}">
      You're receiving this because ${escHtml(inviterName)} added you as a collaborator.
      If this was a mistake, you can ignore this email.
    </div>
  </div>
</body></html>`
}

function collaboratorInviteText({
  toName, inviterName, scriptTitle, scriptId, role, appUrl,
}: { toName: string; inviterName: string; scriptTitle: string; scriptId: string; role: string; appUrl: string }) {
  return `Hi${toName ? ` ${toName}` : ''},

${inviterName} has invited you to ${role === 'viewer' ? 'view' : role === 'admin' ? 'administer' : 'edit'} "${scriptTitle}" on Scripty.

Role: ${role}

Open the script:
${appUrl}/script/${scriptId}

If this was a mistake, you can ignore this email.`
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
