import ErrorBanner from '@/components/ErrorBanner'
import { formatDateTime } from '@/lib/format'
import { loadOrError } from '@/lib/loadOrError'
import { listSubscribers } from '@/lib/subscribers'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ q?: string }>

export default async function SubscribersPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { q = '' } = await searchParams
  const result = await loadOrError(() => listSubscribers(q || undefined))

  return (
    <div>
      <header className="page-header">
        <div>
          <p className="page-kicker">Coming soon</p>
          <h1 className="page-title font-display">Subscribers</h1>
          <p className="page-sub">Emails collected from the coming-soon notify form.</p>
        </div>
        <a className="logout-btn" href="/api/subscribers/export" download>
          Export CSV
        </a>
      </header>

      {!result.ok ? (
        <ErrorBanner
          title="Could not load subscribers"
          message={`${result.error} If the table is missing, run db/migrations/010_newsletter_subscribers.sql in Supabase.`}
        />
      ) : (
        <div className="panel panel-pad">
          <form method="get" style={{ marginBottom: 16 }}>
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search email…"
              aria-label="Search subscribers"
              style={{ width: '100%', maxWidth: 320 }}
            />
          </form>

          <p className="result-count" aria-live="polite">
            {result.data.total} total
            {q ? ` · ${result.data.subscribers.length} matching` : ''}
          </p>

          {result.data.subscribers.length === 0 ? (
            <div className="empty-state">
              <p className="empty-title font-display">No subscribers yet</p>
              <p className="empty-text">Signups from the coming-soon page will appear here.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Source</th>
                    <th>Subscribed</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.subscribers.map((s) => (
                    <tr key={s.id}>
                      <td>{s.email}</td>
                      <td>{s.source}</td>
                      <td>{formatDateTime(s.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
