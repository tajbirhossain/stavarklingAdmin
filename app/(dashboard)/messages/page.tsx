import { Suspense } from 'react'
import ErrorBanner from '@/components/ErrorBanner'
import MessagesWorkspace from '@/components/MessagesWorkspace'
import {
  getMailConfigStatus,
  getMailFromEmail,
  isMailConfigured,
} from '@/lib/zohoMail'

export const dynamic = 'force-dynamic'

export default function MessagesPage() {
  const configured = isMailConfigured()
  const status = getMailConfigStatus()
  const fromEmail = getMailFromEmail()

  return (
    <div>
      <header className="page-header">
        <div>
          <p className="page-kicker">Mailbox</p>
          <h1 className="page-title font-display">Messages</h1>
          <p className="page-sub">
            Send and read mail from {fromEmail} via Zoho Mail API (no IMAP
            required).
          </p>
        </div>
      </header>

      {!configured ? (
        <ErrorBanner
          title="Zoho Mail is not configured"
          message={`Add ${status.missing.join(', ')} to admin-panel/.env.local, then restart the admin panel.`}
        />
      ) : (
        <Suspense
          fallback={
            <div className="panel panel-pad">
              <p className="messages-empty">Loading mailbox…</p>
            </div>
          }
        >
          <MessagesWorkspace fromEmail={fromEmail} />
        </Suspense>
      )}

      {!configured ? (
        <article className="panel panel-pad" style={{ marginTop: '1rem' }}>
          <h2 className="panel-title font-display">Setup (free-plan friendly)</h2>
          <p className="panel-sub">
            Uses Zoho OAuth + Mail API — works when IMAP is locked on Free.
          </p>
          <ol className="settings-list messages-setup-list">
            <li className="settings-item">
              <h3>1. Create a Self Client</h3>
              <p>
                Go to{' '}
                <a
                  href="https://api-console.zoho.com/"
                  target="_blank"
                  rel="noreferrer"
                >
                  api-console.zoho.com
                </a>
                , create a <strong>Self Client</strong>, copy Client ID +
                Client Secret.
              </p>
            </li>
            <li className="settings-item">
              <h3>2. Generate code → refresh token</h3>
              <p>
                Scope:{' '}
                <code>
                  ZohoMail.messages.ALL,ZohoMail.accounts.READ,ZohoMail.folders.READ
                </code>
                . Exchange the code at{' '}
                <code>
                  {status.accountsUrl}/oauth/v2/token?code=…&amp;grant_type=authorization_code&amp;client_id=…&amp;client_secret=…
                </code>
              </p>
            </li>
            <li className="settings-item">
              <h3>3. Env vars</h3>
              <p>
                <code>ZOHO_CLIENT_ID</code>, <code>ZOHO_CLIENT_SECRET</code>,{' '}
                <code>ZOHO_REFRESH_TOKEN</code>,{' '}
                <code>ZOHO_FROM_EMAIL={fromEmail}</code>. Then run{' '}
                <code>npm run mail:probe</code>.
              </p>
            </li>
          </ol>
        </article>
      ) : null}
    </div>
  )
}
