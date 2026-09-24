import Link from 'next/link'
import ErrorBanner from '@/components/ErrorBanner'
import StatusBadge from '@/components/StatusBadge'
import { STAGE_LABELS } from '@/lib/constants'
import { formatRelative } from '@/lib/format'
import { loadOrError } from '@/lib/loadOrError'
import { getDashboardStats } from '@/lib/stats'

export const dynamic = 'force-dynamic'

export default async function OverviewPage() {
  const result = await loadOrError(() => getDashboardStats())

  if (!result.ok) {
    return (
      <div>
        <header className="page-header">
          <div>
            <p className="page-kicker">Overview</p>
            <h1 className="page-title font-display">Operations desk</h1>
          </div>
        </header>
        <ErrorBanner title="Could not load dashboard" message={result.error} />
      </div>
    )
  }

  const stats = result.data
  const maxStage = Math.max(1, ...stats.byStage.map((s) => s.count))

  return (
    <div>
      <header className="page-header">
        <div>
          <p className="page-kicker">Overview</p>
          <h1 className="page-title font-display">Operations desk</h1>
          <p className="page-sub">
            Track applicants, review access, and advance the private journey — selectively.
          </p>
        </div>
        <Link href="/applications" className="btn-primary">
          Review applicants
        </Link>
      </header>

      <section className="stat-grid">
        <article className="panel stat-card" style={{ animationDelay: '40ms' }}>
          <p className="stat-label">Applicants</p>
          <p className="stat-value font-display">{stats.totalApplications}</p>
          <p className="stat-hint">Total access applications</p>
        </article>
        <article className="panel stat-card" style={{ animationDelay: '100ms' }}>
          <p className="stat-label">Needs review</p>
          <p className="stat-value font-display">{stats.pendingReview}</p>
          <p className="stat-hint">Pending or under review</p>
        </article>
        <article className="panel stat-card" style={{ animationDelay: '160ms' }}>
          <p className="stat-label">Approved</p>
          <p className="stat-value font-display">{stats.approved}</p>
          <p className="stat-hint">{stats.rejected} rejected</p>
        </article>
        <article className="panel stat-card" style={{ animationDelay: '220ms' }}>
          <p className="stat-label">Stage requests</p>
          <p className="stat-value font-display">{stats.stageRequestsOpen}</p>
          <p className="stat-hint">Awaiting your decision</p>
        </article>
      </section>

      <section className="grid-2">
        <article className="panel panel-pad">
          <h2 className="panel-title font-display">Recent applicants</h2>
          <p className="panel-sub">Latest submissions across the access flow.</p>
          {stats.recentApplications.length === 0 ? (
            <div className="empty-state">
              <p className="empty-title font-display">No applicants yet</p>
              <p className="empty-text">New access applications will appear here.</p>
            </div>
          ) : (
            <div className="recent-list">
              {stats.recentApplications.map((app) => (
                <Link key={app.id} href={`/applications/${app.id}`} className="recent-item">
                  <div>
                    <p className="recent-name">{app.fullName}</p>
                    <p className="recent-meta">
                      {app.country} · {formatRelative(app.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={app.status} />
                </Link>
              ))}
            </div>
          )}
        </article>

        <article className="panel panel-pad">
          <h2 className="panel-title font-display">Approved by stage</h2>
          <p className="panel-sub">Where approved members currently stand.</p>
          <div className="stage-bars">
            {stats.byStage.map((row) => (
              <div key={row.stage} className="stage-row">
                <span className="stage-row-label">{STAGE_LABELS[row.stage].title}</span>
                <div className="stage-track">
                  <div
                    className="stage-fill"
                    style={{ width: `${Math.max(8, (row.count / maxStage) * 100)}%` }}
                  />
                </div>
                <span className="stage-count">{row.count}</span>
              </div>
            ))}
          </div>
          <div className="section-gap">
            <Link href="/stage-requests" className="table-link">
              Open stage requests →
            </Link>
          </div>
        </article>
      </section>
    </div>
  )
}
