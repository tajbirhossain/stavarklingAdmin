import Link from 'next/link'
import StatusBadge from '@/components/StatusBadge'
import StageBadge from '@/components/StageBadge'
import { formatRelative, truncate } from '@/lib/format'
import type { Application } from '@/lib/types'

export default function ApplicationsTable({
  applications,
}: {
  applications: Application[]
}) {
  if (applications.length === 0) {
    return (
      <div className="empty-state">
        <p className="empty-title font-display">No applicants yet</p>
        <p className="empty-text">New access applications will appear here as they arrive.</p>
      </div>
    )
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Applicant</th>
            <th>Status</th>
            <th>Stage</th>
            <th>Country</th>
            <th>Submitted</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {applications.map((app) => (
            <tr key={app.id}>
              <td>
                <div className="cell-stack">
                  <span className="cell-primary">{app.fullName}</span>
                  <span className="cell-muted">{app.email}</span>
                  <span className="cell-reason">{truncate(app.reason, 90)}</span>
                </div>
              </td>
              <td>
                <div className="cell-stack-tight">
                  <StatusBadge status={app.status} />
                  {app.pendingStageRequest ? (
                    <span className="request-chip">Stage request</span>
                  ) : null}
                </div>
              </td>
              <td>
                <StageBadge stage={app.accessStage} />
              </td>
              <td>{app.country}</td>
              <td>
                <span className="cell-muted">{formatRelative(app.createdAt)}</span>
              </td>
              <td className="cell-actions">
                <Link href={`/applications/${app.id}`} className="table-link">
                  Review
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
