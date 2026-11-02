import ErrorBanner from '@/components/ErrorBanner'
import ApplicationFilters from '@/components/ApplicationFilters'
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
          <ApplicationFilters q={q} status={status} stage={params.stage || 'all'} />

          <p className="result-count" aria-live="polite">
            {result.data.length} {result.data.length === 1 ? 'applicant' : 'applicants'}
            {q || status !== 'all' || stage !== 'all' ? ' matching your filters' : ''}
          </p>

          <ApplicationsTable applications={result.data} />
        </div>
      )}
    </div>
  )
}
