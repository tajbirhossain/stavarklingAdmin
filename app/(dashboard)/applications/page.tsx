import ErrorBanner from '@/components/ErrorBanner'
import ApplicationFilters from '@/components/ApplicationFilters'
import ApplicationFolders from '@/components/ApplicationFolders'
import ApplicationsTable from '@/components/ApplicationsTable'
import { getFolderCounts, listApplications } from '@/lib/applications'
import { getFolder, isFolderId, type FolderId } from '@/lib/applicationFolders'
import { loadOrError } from '@/lib/loadOrError'
import type { AccessStage, ApplicationStatus } from '@/lib/types'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<{
  folder?: string
  status?: string
  stage?: string
  q?: string
}>

// Older links used ?status= and ?stage=. Map them onto the matching folder.
function resolveFolder(params: {
  folder?: string
  status?: string
  stage?: string
}): FolderId {
  if (isFolderId(params.folder)) return params.folder
  const status = params.status === 'under_review' ? 'under-review' : params.status
  if (isFolderId(status) && status !== 'all') return status
  if (params.stage === '1' || params.stage === '2' || params.stage === '3') {
    return `stage-${params.stage}` as FolderId
  }
  return 'all'
}

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const folder = resolveFolder(params)
  const q = params.q || ''

  // Only a legacy link that mixes status and stage needs both applied.
  const legacyStatus =
    params.folder || !params.status || params.status === 'all'
      ? 'all'
      : (params.status as ApplicationStatus)
  const legacyStage =
    params.folder || !params.stage || params.stage === 'all'
      ? 'all'
      : (Number(params.stage) as AccessStage)

  const [counts, result] = await Promise.all([
    loadOrError(() => getFolderCounts()),
    loadOrError(() =>
      listApplications({
        folder,
        status: legacyStatus,
        stage: legacyStage,
        q: q || undefined,
      })
    ),
  ])

  const def = getFolder(folder)

  return (
    <div>
      <header className="page-header">
        <div>
          <p className="page-kicker">Applicants</p>
          <h1 className="page-title font-display">Access applications</h1>
          <p className="page-sub">
            Open a folder to see who needs you, where everyone is in the journey, or who
            is closed out.
          </p>
        </div>
      </header>

      {!result.ok ? (
        <ErrorBanner title="Could not load applicants" message={result.error} />
      ) : (
        <div className="folder-layout">
          {counts.ok ? (
            <ApplicationFolders active={folder} counts={counts.data} q={q} />
          ) : null}

          <div className="panel panel-pad folder-main">
            <div className="folder-heading">
              <h2 className="folder-title font-display">{def.label}</h2>
              <p className="folder-hint">{def.hint}</p>
            </div>

            <ApplicationFilters q={q} folder={folder} />

            <p className="result-count" aria-live="polite">
              {result.data.length} {result.data.length === 1 ? 'applicant' : 'applicants'}
              {q ? ` matching “${q}” in ${def.label}` : ''}
            </p>

            {result.data.length === 0 ? (
              <div className="empty-state">
                <p className="empty-title font-display">
                  {q ? 'No one matches that search' : 'Nothing here'}
                </p>
                <p className="empty-text">
                  {q
                    ? `No one in “${def.label}” matches “${q}”. Try a different word, or clear the search.`
                    : def.empty}
                </p>
              </div>
            ) : (
              <ApplicationsTable applications={result.data} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
