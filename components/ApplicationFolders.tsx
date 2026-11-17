import Link from 'next/link'
import {
  FOLDERS,
  FOLDER_GROUPS,
  type FolderCounts,
  type FolderId,
} from '@/lib/applicationFolders'

export default function ApplicationFolders({
  active,
  counts,
  q,
}: {
  active: FolderId
  counts: FolderCounts
  q: string
}) {
  function href(id: FolderId) {
    const params = new URLSearchParams()
    if (id !== 'all') params.set('folder', id)
    if (q) params.set('q', q)
    const qs = params.toString()
    return qs ? `/applications?${qs}` : '/applications'
  }

  return (
    <nav className="folder-nav" aria-label="Applicant folders">
      {FOLDER_GROUPS.map((group) => {
        const items = FOLDERS.filter(
          (f) =>
            f.group === group.id &&
            (!f.hideWhenEmpty || counts[f.id] > 0 || f.id === active)
        )
        if (items.length === 0) return null
        return (
          <div key={group.id} className="folder-group">
            <p className="folder-group-label">{group.label}</p>
            <ul className="folder-list">
              {items.map((f) => {
                const count = counts[f.id]
                const isActive = f.id === active
                const urgent = f.id === 'needs-decision' && count > 0
                return (
                  <li key={f.id}>
                    <Link
                      href={href(f.id)}
                      className={[
                        'folder-item',
                        isActive ? 'is-active' : '',
                        count === 0 && !isActive ? 'is-empty' : '',
                        urgent ? 'is-urgent' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <span className="folder-item-label">{f.label}</span>
                      <span className="folder-item-count">{count}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </nav>
  )
}
