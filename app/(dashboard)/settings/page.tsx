import {
  checkDatabaseConnection,
  hasDatabaseUrl,
} from '@/lib/db'
import { countAdminAccounts } from '@/lib/auth'
import { loadOrError } from '@/lib/loadOrError'
import ErrorBanner from '@/components/ErrorBanner'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const dbCheck = await checkDatabaseConnection()
  const accounts = await loadOrError(() => countAdminAccounts())
  const sessionSecretOk = Boolean(
    process.env.ADMIN_SESSION_SECRET && process.env.ADMIN_SESSION_SECRET.length >= 16
  )

  return (
    <div>
      <header className="page-header">
        <div>
          <p className="page-kicker">Settings</p>
          <h1 className="page-title font-display">Admin configuration</h1>
          <p className="page-sub">
            Uses the Stavarkling DATABASE_URL automatically. Admin secrets stay in
            admin-panel/.env.local.
          </p>
        </div>
      </header>

      {!dbCheck.ok ? (
        <ErrorBanner
          title="Database not connected"
          message={dbCheck.error || 'Unknown connection error'}
        />
      ) : null}

      <article className="panel panel-pad">
        <h2 className="panel-title font-display">Connection health</h2>
        <p className="panel-sub">Live status for this operations panel.</p>

        <div className="settings-list">
          <div className="settings-item">
            <h3>DATABASE_URL</h3>
            <p>
              {hasDatabaseUrl()
                ? dbCheck.ok
                  ? 'Loaded from Stavarkling env and connected.'
                  : 'Present but connection failed — check the error above.'
                : 'Missing. Confirm stavarkling/.env or .env.local exists with DATABASE_URL.'}
            </p>
          </div>
          <div className="settings-item">
            <h3>Admin account (DB)</h3>
            <p>
              {!accounts.ok
                ? accounts.error
                : accounts.data > 0
                  ? 'Configured — login validates against the hashed password in admin_accounts.'
                  : 'Not set up yet. Set ADMIN_BOOTSTRAP_PASSWORD and sign in once, or run npm run admin:set-password.'}
            </p>
          </div>
          <div className="settings-item">
            <h3>ADMIN_SESSION_SECRET</h3>
            <p>
              {sessionSecretOk
                ? 'Configured — cookies are signed and sessions are stored hashed in the DB.'
                : 'Missing or too short. Add a 16+ character secret to admin-panel/.env.local.'}
            </p>
          </div>
          <div className="settings-item">
            <h3>Security notes</h3>
            <p>
              API routes require a live DB session (not cookie shape alone). Logins lock after 5
              failed attempts. Mutations use optimistic concurrency and optional Idempotency-Key.
            </p>
          </div>
        </div>
      </article>
    </div>
  )
}
