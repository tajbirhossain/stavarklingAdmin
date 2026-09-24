import ErrorBanner from '@/components/ErrorBanner'
import StageRequestsList from '@/components/StageRequestsList'
import { loadOrError } from '@/lib/loadOrError'
import { listStageRequests } from '@/lib/stageRequests'

export const dynamic = 'force-dynamic'

export default async function StageRequestsPage() {
  const result = await loadOrError(() => listStageRequests())

  return (
    <div>
      <header className="page-header">
        <div>
          <p className="page-kicker">Journey</p>
          <h1 className="page-title font-display">Stage requests</h1>
          <p className="page-sub">
            Members asking to move forward — advance only when the moment is right.
          </p>
        </div>
      </header>

      {!result.ok ? (
        <ErrorBanner title="Could not load stage requests" message={result.error} />
      ) : (
        <div className="panel panel-pad">
          <StageRequestsList requests={result.data} />
        </div>
      )}
    </div>
  )
}
