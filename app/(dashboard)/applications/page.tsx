import ErrorBanner from '@/components/ErrorBanner'
import ApplicationsTable from '@/components/ApplicationsTable'
import { listApplications } from '@/lib/applications'
import { loadOrError } from '@/lib/loadOrError'
import type { AccessStage, ApplicationStatus } from '@/lib/types'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<{
  status?: string
  stage?: string
  q?: string
}>

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const status = (params.status || 'all') as ApplicationStatus | 'all'
  const stage =
    !params.stage || params.stage === 'all'
      ? 'all'
      : (Number(params.stage) as AccessStage)
  const q = params.q || ''

  const result = await loadOrError(() =>
    listApplications({
      status,
      stage,
      q: q || undefined,
    })
  )

  return (
    <div>
      <header className="page-header">
        <div>
          <p className="page-kicker">Applicants</p>
          <h1 className="page-title font-display">Access applications</h1>
          <p className="page-sub">
            Review identity, motivation, and journey progress for every request.
          </p>
        </div>
      </header>

      {!result.ok ? (
        <ErrorBanner title="Could not load applicants" message={result.error} />
      ) : (
        <div className="panel panel-pad">
          <form className="filter-form toolbar" method="get">
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search name, email, country…"
            />
            <select name="status" defaultValue={status}>
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="under_review">Under review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="withdrawn">Withdrawn</option>
            </select>
            <select name="stage" defaultValue={params.stage || 'all'}>
              <option value="all">All stages</option>
              <option value="1">Stage 1</option>
              <option value="2">Stage 2</option>
              <option value="3">Stage 3</option>
            </select>
            <button type="submit" className="btn-ghost">
              Filter
            </button>
          </form>

          <ApplicationsTable applications={result.data} />
        </div>
      )}
    </div>
  )
}
