// Client-safe (no database imports): the "folders" the admin sees on the
// Applicants page. Each folder is a plain-English way of slicing the same list.

export type FolderId =
  | 'all'
  | 'needs-decision'
  | 'new'
  | 'stage-1'
  | 'stage-2'
  | 'stage-3'
  | 'rejected'
  | 'withdrawn'
  | 'pending'
  | 'under-review'
  | 'approved'

export type FolderGroupId = 'start' | 'journey' | 'closed' | 'review'

export type FolderDef = {
  id: FolderId
  group: FolderGroupId
  label: string
  /** One line shown above the list when the folder is open. */
  hint: string
  /** Shown when the folder has nobody in it. */
  empty: string
  /** Only listed while it has people in it. */
  hideWhenEmpty?: boolean
}

export const FOLDER_GROUPS: { id: FolderGroupId; label: string }[] = [
  { id: 'start', label: 'Start here' },
  { id: 'journey', label: 'Where they are' },
  { id: 'closed', label: 'Closed out' },
  { id: 'review', label: 'Review status' },
]

export const FOLDERS: FolderDef[] = [
  {
    id: 'all',
    group: 'start',
    label: 'All applicants',
    hint: 'Everyone who has applied for access.',
    empty: 'No one has applied yet. New applicants will appear here.',
  },
  {
    id: 'needs-decision',
    group: 'start',
    label: 'Needs your decision',
    hint: 'They have asked to enter Stage 3 (The Decision). The person waiting longest is first.',
    empty: 'No one is waiting for you right now.',
  },
  {
    id: 'new',
    group: 'start',
    label: 'New this week',
    hint: 'Applied in the last 7 days.',
    empty: 'No new applicants in the last 7 days.',
  },
  {
    id: 'stage-1',
    group: 'journey',
    label: 'Stage 1 · The Beginning',
    hint: 'Just applied. They have not been past the first stage yet.',
    empty: 'No one is at Stage 1 right now.',
  },
  {
    id: 'stage-2',
    group: 'journey',
    label: 'Stage 2 · The Moment',
    hint: 'Inside The Moment. They can ask you for The Decision.',
    empty: 'No one is at Stage 2 right now.',
  },
  {
    id: 'stage-3',
    group: 'journey',
    label: 'Stage 3 · The Decision',
    hint: 'You have opened The Decision for them.',
    empty: 'No one has been given Stage 3 yet.',
  },
  {
    id: 'rejected',
    group: 'closed',
    label: 'Rejected',
    hint: 'People you have turned down.',
    empty: 'No one has been rejected.',
  },
  {
    id: 'withdrawn',
    group: 'closed',
    label: 'Withdrawn',
    hint: 'People who withdrew their application.',
    empty: 'No one has withdrawn.',
  },
  {
    id: 'pending',
    group: 'review',
    label: 'Pending',
    hint: 'Applications with the status "Pending". This is the default for new applicants.',
    empty: 'No applications are pending.',
  },
  {
    id: 'under-review',
    group: 'review',
    label: 'Under review',
    hint: 'Applications marked "Under review".',
    empty: 'No applications are under review.',
    hideWhenEmpty: true,
  },
  {
    id: 'approved',
    group: 'review',
    label: 'Approved',
    hint: 'Applications marked "Approved".',
    empty: 'No applications are marked approved.',
  },
]

const FOLDER_IDS = new Set<string>(FOLDERS.map((f) => f.id))

export function isFolderId(value: unknown): value is FolderId {
  return typeof value === 'string' && FOLDER_IDS.has(value)
}

export function getFolder(id: FolderId): FolderDef {
  return FOLDERS.find((f) => f.id === id) ?? FOLDERS[0]
}

export type FolderCounts = Record<FolderId, number>
