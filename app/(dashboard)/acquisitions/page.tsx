import Link from 'next/link'
import AcquisitionStatusSelect from '@/components/AcquisitionStatusSelect'
import ErrorBanner from '@/components/ErrorBanner'
import { listAcquisitions } from '@/lib/acquisitions'
import { applicantComposeHref } from '@/lib/composeMail'
import { formatDateTime, formatRelative } from '@/lib/format'
import { loadOrError } from '@/lib/loadOrError'

export const dynamic = 'force-dynamic'

export default async function AcquisitionsPage() {
  const result = await loadOrError(() => listAcquisitions())

  return (
    <div>
      <header className="page-header">
        <div>
          <p className="page-kicker">Final stage</p>
          <h1 className="page-title font-display">Private acquisition</h1>
          <p className="page-sub">
            Collectors who began the conversation. Reply within 24 hours.
          </p>
        </div>
      </header>

      {!result.ok ? (
        <ErrorBanner
          title="Could not load enquiries"
          message={`${result.error} If the table is missing, run db/migrations/011_acquisition_enquiries.sql in Supabase.`}
        />
      ) : result.data.length === 0 ? (
        <div className="panel panel-pad">
          <div className="empty-state">
            <p className="empty-title font-display">No enquiries yet</p>
            <p className="empty-text">
              They appear here when a stage-3 collector begins the conversation.
            </p>
          </div>
        </div>
      ) : (
        <div className="panel panel-pad">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Collector</th>
                  <th>Their answers</th>
                  <th>Contact</th>
                  <th>Received</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {result.data.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <div className="cell-stack">
                        <Link
                          href={`/applications/${e.applicationId}`}
                          className="cell-primary cell-name"
                        >
                          {e.fullName}
                        </Link>
                        <span className="cell-muted">{e.email}</span>
                        {e.country ? (
                          <span className="cell-muted">{e.country}</span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <div className="cell-stack">
                        <span className="cell-reason">
                          <strong>Place:</strong> {e.placeAnswer}
                        </span>
                        {e.drawAnswer ? (
                          <span className="cell-reason">
                            <strong>Drawn by:</strong> {e.drawAnswer}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <div className="cell-stack">
                        <span className="cell-primary">{e.contactMethod}</span>
                        {e.contactDetail ? (
                          <span className="cell-muted">{e.contactDetail}</span>
                        ) : null}
                        {e.bestTime ? (
                          <span className="cell-muted">{e.bestTime}</span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <div className="cell-stack-tight">
                        <span>{formatRelative(e.createdAt)}</span>
                        <span className="cell-muted">{formatDateTime(e.createdAt)}</span>
                        {e.overdue ? (
                          <span className="status-badge status-rejected">
                            Over 24h, no reply
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <AcquisitionStatusSelect id={e.id} status={e.status} />
                    </td>
                    <td>
                      <Link
                        href={applicantComposeHref(e.email, e.fullName)}
                        className="btn-ghost"
                      >
                        Reply
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
