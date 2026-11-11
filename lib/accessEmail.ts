import { Resend } from 'resend'

const CONTACT_EMAIL = 'private@stavarkling.com'

let client: Resend | null = null

function getResend() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY is not set.')
  if (!client) client = new Resend(apiKey)
  return client
}

/** Collector-facing sender always reads "Stavarkling". */
function getFrom() {
  const configured = process.env.RESEND_FROM_EMAIL?.trim()
  if (!configured) throw new Error('RESEND_FROM_EMAIL is not set.')
  const address = configured.match(/<([^>]+)>/)?.[1] ?? configured
  return `Stavarkling <${address}>`
}

function siteUrl() {
  return (process.env.ACCESS_SITE_URL?.trim() || 'https://stavarkling.vercel.app').replace(
    /\/+$/,
    ''
  )
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Sent when a Decision request is approved. The button opens The Decision;
 * the visitor confirms with their usual email code if they are not signed in.
 */
export async function sendDecisionInvitationEmail(input: {
  to: string
  fullName: string
}) {
  const first = input.fullName.trim().split(/\s+/)[0] || 'there'
  const link = `${siteUrl()}/access/stage-3`
  const font = "Georgia,'Times New Roman',serif"

  const { error } = await getResend().emails.send({
    from: getFrom(),
    to: input.to,
    replyTo: CONTACT_EMAIL,
    subject: 'Your invitation to The Decision',
    html: `
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="color-scheme" content="light only" />
          <meta name="supported-color-schemes" content="light only" />
          <title>Your invitation to The Decision</title>
        </head>
        <body style="margin:0; padding:0; background:#f6eef0;" bgcolor="#f6eef0">
          <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:#f6eef0;">
            Your request has been reviewed. The Decision is now open to you.
          </div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f6eef0" style="background:#f6eef0;">
            <tr>
              <td align="center" style="padding:36px 14px 44px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;">
                  <tr>
                    <td align="center" aria-hidden="true" style="padding:0 0 8px; font-family:${font}; font-size:12px; line-height:1; letter-spacing:0.9em; color:#d8b9c4;">
                      &middot; &#10023; &middot; &#8902; &middot; &#10022; &middot;
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding:14px 0 24px; font-family:${font}; font-size:13px; letter-spacing:0.55em; color:#9a2349; text-transform:uppercase;">
                      Stavarkling
                    </td>
                  </tr>
                  <tr>
                    <td bgcolor="#fffdfd" style="background:#fffdfd; border:1px solid #ecd5dc; border-radius:18px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td align="center" aria-hidden="true" style="padding:40px 40px 0; font-family:${font}; font-size:15px; line-height:1; letter-spacing:0.7em; color:#c8708e;">
                            &#10022; &#10023; &#10022;
                          </td>
                        </tr>
                        <tr>
                          <td align="center" style="padding:20px 40px 0; font-family:${font}; font-size:11px; letter-spacing:0.34em; color:#9a2349; text-transform:uppercase;">
                            Private Access
                          </td>
                        </tr>
                        <tr>
                          <td align="center" style="padding:14px 40px 0; font-family:${font}; font-size:31px; line-height:1.25; font-weight:normal; color:#2a1f23;">
                            Your request has been reviewed
                          </td>
                        </tr>
                        <tr>
                          <td align="center" aria-hidden="true" style="padding:22px 40px 0; font-family:${font}; font-size:13px; line-height:1; letter-spacing:0.6em; color:#d3a3b4;">
                            &middot; &#10022; &middot;
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:30px 40px 0; font-family:${font}; font-size:17px; line-height:1.75; color:#2a1f23;">
                            Dear ${escapeHtml(first)},
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:14px 40px 0; font-family:${font}; font-size:17px; line-height:1.75; color:#2a1f23;">
                            The Decision is now open to you.
                          </td>
                        </tr>
                        <tr>
                          <td align="center" style="padding:32px 40px 0;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                              <tr>
                                <td align="center" bgcolor="#9a2349" style="background:#9a2349; border-radius:999px;">
                                  <a href="${link}" style="display:inline-block; padding:16px 34px; font-family:${font}; font-size:14px; letter-spacing:0.2em; color:#ffffff; text-decoration:none; text-transform:uppercase;">
                                    Enter the decision &rarr;
                                  </a>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td align="center" aria-hidden="true" style="padding:34px 40px 0; font-family:${font}; font-size:13px; line-height:1; letter-spacing:0.6em; color:#d3a3b4;">
                            &middot; &#10022; &middot;
                          </td>
                        </tr>
                        <tr>
                          <td align="center" style="padding:20px 40px 42px; font-family:${font}; font-size:15px; letter-spacing:0.06em;">
                            <a href="mailto:${CONTACT_EMAIL}" style="color:#9a2349; text-decoration:none;">${CONTACT_EMAIL}</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" aria-hidden="true" style="padding:26px 0 0; font-family:${font}; font-size:12px; line-height:1; letter-spacing:0.9em; color:#d8b9c4;">
                      &#8902; &middot; &#10023; &middot; &middot; &#10022; &middot; &#8902;
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    text: [
      'PRIVATE ACCESS',
      'Your request has been reviewed',
      '',
      `Dear ${first},`,
      '',
      'The Decision is now open to you.',
      '',
      `ENTER THE DECISION: ${link}`,
      '',
      CONTACT_EMAIL,
    ].join('\n'),
  })

  if (error) {
    throw new Error(error.message || 'Failed to send email')
  }
}
