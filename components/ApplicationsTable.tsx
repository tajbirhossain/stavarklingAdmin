import Link from 'next/link'
import Avatar from '@/components/Avatar'
import StatusBadge from '@/components/StatusBadge'
import StageBadge from '@/components/StageBadge'
import { applicantComposeHref } from '@/lib/composeMail'
import { formatRelative, truncate } from '@/lib/format'
import type { Application } from '@/lib/types'

const iconProps = {
  width: 14,
  height: 14,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export default function ApplicationsTable({
  applications,
}: {
  applications: Application[]
}) {
  if (applications.length === 0) {
    return (
      <div className="empty-state">
        <p className="empty-title font-display">No applicants found</p>
        <p className="empty-text">
          Nothing matches right now. Adjust or clear the filters, or check back as new
          access applications arrive.
        </p>
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
                <div className="cell-person">
                  <Avatar name={app.fullName} />
                  <div className="cell-stack">
                    <Link href={`/applications/${app.id}`} className="cell-primary cell-name">
                      {app.fullName}
                    </Link>
                    <span className="cell-muted">{app.email}</span>
                    {app.reason ? (
                      <span className="cell-reason">{truncate(app.reason, 90)}</span>
                    ) : null}
                  </div>
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
              <td>
                <div className="cell-actions">
                  <Link
                    href={applicantComposeHref(app.email, app.fullName)}
                    className="btn-ghost btn-sm"
                    aria-label={`Email ${app.fullName}`}
                  >
                    <svg {...iconProps}>
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <path d="m3 7 9 6 9-6" />
                    </svg>
                    Email
                  </Link>
                  <Link
                    href={`/applications/${app.id}`}
                    className="btn-primary btn-sm"
                    aria-label={`Review ${app.fullName}`}
                  >
                    Review
                    <svg {...iconProps}>
                      <path d="M5 12h14" />
                      <path d="m13 6 6 6-6 6" />
                    </svg>
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
