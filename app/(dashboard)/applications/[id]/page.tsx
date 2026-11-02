import Link from 'next/link'
import { notFound } from 'next/navigation'
import ApplicationActions from '@/components/ApplicationActions'
import Avatar from '@/components/Avatar'
import ErrorBanner from '@/components/ErrorBanner'
import StageBadge from '@/components/StageBadge'
import StatusBadge from '@/components/StatusBadge'
import { getApplication } from '@/lib/applications'
import { applicantComposeHref } from '@/lib/composeMail'
import { formatDateTime } from '@/lib/format'
import { loadOrError } from '@/lib/loadOrError'

export const dynamic = 'force-dynamic'

type Params = Promise<{ id: string }>

export default async function ApplicationDetailPage({ params }: { params: Params }) {
  const { id } = await params
  const result = await loadOrError(() => getApplication(id))

  if (!result.ok) {
    return (
      <div>
        <Link href="/applications" className="back-link">
          ← Back to applicants
        </Link>
        <ErrorBanner title="Could not load applicant" message={result.error} />
      </div>
    )
  }

  const application = result.data
  if (!application) notFound()

  return (
    <div>
      <Link href="/applications" className="back-link">
        ← Back to applicants
      </Link>

      <div className="detail-layout">
        <article className="panel detail-hero">
          <div className="detail-hero-top">
            <div className="cell-person">
              <Avatar name={application.fullName} size="lg" />
              <div>
                <p className="page-kicker">Applicant</p>
                <h1 className="detail-name font-display">{application.fullName}</h1>
                <p className="detail-email">{application.email}</p>
              </div>
            </div>
            <Link
              href={applicantComposeHref(application.email, application.fullName)}
              className="btn-primary detail-email-btn"
            >
              Send email
            </Link>
          </div>

          <div className="detail-chips">
            <StatusBadge status={application.status} />
            <StageBadge stage={application.accessStage} />
            {application.pendingStageRequest ? (
              <span className="request-chip">Open stage request</span>
            ) : null}
          </div>

          <div className="meta-grid">
            <div className="meta-item">
              <p className="meta-label">Country</p>
              <p className="meta-value">{application.country}</p>
            </div>
            <div className="meta-item">
              <p className="meta-label">Submitted</p>
              <p className="meta-value">{formatDateTime(application.createdAt)}</p>
            </div>
            <div className="meta-item">
              <p className="meta-label">Stage updated</p>
              <p className="meta-value">{formatDateTime(application.accessStageUpdatedAt)}</p>
            </div>
            <div className="meta-item">
              <p className="meta-label">Last updated</p>
              <p className="meta-value">{formatDateTime(application.updatedAt)}</p>
            </div>
          </div>

          {application.reason ? (
            <div className="prose-block">
              <h3>Personal note</h3>
              <p>{application.reason}</p>
            </div>
          ) : null}
        </article>

        <div className="panel">
          <ApplicationActions application={application} />
        </div>
      </div>
    </div>
  )
}
