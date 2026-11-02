import Avatar from '@/components/Avatar'
import ChangePasswordForm from '@/components/ChangePasswordForm'
import ErrorBanner from '@/components/ErrorBanner'
import SignOutOthersButton from '@/components/SignOutOthersButton'
import { getAccountOverview, SECURITY_POLICY } from '@/lib/account'
import { countAdminAccounts, getCurrentSession } from '@/lib/auth'
import { STAGE_LABELS } from '@/lib/constants'
import { checkDatabaseConnection } from '@/lib/db'
import { formatDateTime, formatRelative } from '@/lib/format'
import { loadOrError } from '@/lib/loadOrError'
import { getMailConfigStatus, probeMail } from '@/lib/zohoMail'

export const dynamic = 'force-dynamic'

type StatusRow = {
  label: string
  ok: boolean
  summary: string
  /** Technical detail shown only when something needs attention. */
  fix?: string
}

export default async function SettingsPage() {
  const session = await getCurrentSession()
  const dbCheck = await checkDatabaseConnection()
  const accounts = await loadOrError(() => countAdminAccounts())
  const overview = session
    ? await loadOrError(() => getAccountOverview(session.adminId, session.sessionId))
    : null

  const sessionSecretOk = Boolean(
    process.env.ADMIN_SESSION_SECRET && process.env.ADMIN_SESSION_SECRET.length >= 16
  )
  const mailStatus = getMailConfigStatus()
  const mailProbe = mailStatus.configured ? await probeMail() : null

  const account = overview && overview.ok ? overview.data : null

  const statusRows: StatusRow[] = [
    {
      label: 'Applicant database',
      ok: dbCheck.ok,
      summary: dbCheck.ok
        ? 'Connected — applications and stage requests are loading normally.'
        : 'Not connected — applicant data cannot be loaded or saved.',
      fix: dbCheck.ok ? undefined : dbCheck.error || 'Check DATABASE_URL in admin-panel/.env.local.',
    },
    {
      label: 'Email to applicants',
      ok: Boolean(mailProbe?.ok),
      summary: !mailStatus.configured
        ? 'Not set up — the Messages inbox is unavailable.'
        : mailProbe?.ok
          ? `Connected — sending as ${mailProbe.fromEmail}.`
          : 'Connection problem — replies may not send.',
      fix: !mailStatus.configured
        ? `Missing ${mailStatus.missing.join(', ')} in admin-panel/.env.local.`
        : mailProbe?.ok
          ? undefined
          : mailProbe?.error || 'Unknown error',
    },
    {
      label: 'Sign-in security',
      ok: sessionSecretOk && accounts.ok && accounts.data > 0,
      summary:
        sessionSecretOk && accounts.ok && accounts.data > 0
          ? 'Protected — sessions are signed and the admin password is stored hashed.'
          : 'Needs attention — sign-in is not fully configured.',
      fix: !sessionSecretOk
        ? 'Add an ADMIN_SESSION_SECRET of 16+ characters to admin-panel/.env.local.'
        : !accounts.ok
          ? accounts.error
          : accounts.data === 0
            ? 'No admin account yet: set ADMIN_BOOTSTRAP_PASSWORD and sign in once, or run npm run admin:set-password.'
            : undefined,
    },
  ]

  const allGood = statusRows.every((row) => row.ok)

  return (
    <div>
      <header className="page-header">
        <div>
          <p className="page-kicker">Settings</p>
          <h1 className="page-title font-display">Account &amp; system</h1>
          <p className="page-sub">
            Manage your sign-in, keep the desk secure, and check that everything the journey
            depends on is running.
          </p>
        </div>
      </header>

      {!dbCheck.ok ? (
        <ErrorBanner
          title="Database not connected"
          message={dbCheck.error || 'Unknown connection error'}
        />
      ) : null}

      <section className="grid-2 settings-grid">
        <article className="panel panel-pad">
          <h2 className="panel-title font-display">Your account</h2>
          <p className="panel-sub">The operator signed in on this device.</p>

          {account ? (
            <>
              <div className="account-head">
                <Avatar name={account.username} size="lg" />
                <div>
                  <p className="account-name">{account.username}</p>
                  <p className="account-role">Operations administrator</p>
                </div>
              </div>

              <dl className="account-facts">
                <div>
                  <dt>Signed in</dt>
                  <dd>{formatDateTime(account.sessionStartedAt)}</dd>
                </div>
                <div>
                  <dt>Last active</dt>
                  <dd>{formatRelative(account.lastSeenAt)}</dd>
                </div>
                <div>
                  <dt>Session ends</dt>
                  <dd>{formatDateTime(account.sessionExpiresAt)}</dd>
                </div>
                <div>
                  <dt>Other devices</dt>
                  <dd>
                    {account.otherActiveSessions === 0
                      ? 'None signed in'
                      : `${account.otherActiveSessions} signed in`}
                  </dd>
                </div>
              </dl>

              <SignOutOthersButton count={account.otherActiveSessions} />
            </>
          ) : (
            <p className="inline-note">
              Account details are unavailable right now.
              {overview && !overview.ok ? ` ${overview.error}` : ''}
            </p>
          )}
        </article>

        <article className="panel panel-pad">
          <h2 className="panel-title font-display">Change password</h2>
          <p className="panel-sub">
            Updating it signs out every other device. You stay signed in here.
          </p>
          <ChangePasswordForm />
        </article>
      </section>

      <article className="panel panel-pad section-gap">
        <div className="status-head">
          <div>
            <h2 className="panel-title font-display">System status</h2>
            <p className="panel-sub">What the desk relies on, checked just now.</p>
          </div>
          <span className={`health-pill ${allGood ? 'health-ok' : 'health-warn'}`}>
            <span className="health-dot" />
            {allGood ? 'All systems normal' : 'Needs attention'}
          </span>
        </div>

        <ul className="status-list">
          {statusRows.map((row) => (
            <li key={row.label} className="status-item">
              <span className={`health-dot ${row.ok ? 'health-dot-ok' : 'health-dot-warn'}`} />
              <div>
                <p className="status-label">{row.label}</p>
                <p className="status-summary">{row.summary}</p>
                {row.fix ? <p className="status-fix">{row.fix}</p> : null}
              </div>
            </li>
          ))}
        </ul>
      </article>

      <section className="grid-2 settings-grid section-gap">
        <article className="panel panel-pad">
          <h2 className="panel-title font-display">The member journey</h2>
          <p className="panel-sub">
            The three stages members move through. Advance them from Applicants or Stage
            requests.
          </p>
          <ol className="journey-list">
            {([1, 2, 3] as const).map((stage) => (
              <li key={stage} className="journey-item">
                <span className="journey-num">{STAGE_LABELS[stage].number}</span>
                <div>
                  <p className="status-label">{STAGE_LABELS[stage].title}</p>
                  <p className="status-summary">
                    {stage === 1
                      ? 'Member meets the artwork and the idea behind the experiment.'
                      : stage === 2
                        ? 'Member imagines the artwork in their own collection.'
                        : 'Member can begin the private acquisition conversation.'}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </article>

        <article className="panel panel-pad">
          <h2 className="panel-title font-display">Security policy</h2>
          <p className="panel-sub">How the admin desk protects itself.</p>
          <ul className="policy-list">
            <li>
              Sessions last <strong>{SECURITY_POLICY.sessionHours} hours</strong>, then you sign in
              again.
            </li>
            <li>
              After <strong>{SECURITY_POLICY.maxFailedLogins} wrong passwords</strong> the account
              locks for <strong>{SECURITY_POLICY.lockoutMinutes} minutes</strong>.
            </li>
            <li>Every action needs a live, signed-in session — not just a saved cookie.</li>
            <li>
              Saving the same change twice, or editing a stale page, is blocked so applicants
              are never changed by accident.
            </li>
          </ul>
        </article>
      </section>
    </div>
  )
}
