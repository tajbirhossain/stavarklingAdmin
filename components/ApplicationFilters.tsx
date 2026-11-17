import Link from 'next/link'

type Props = {
  q: string
  folder: string
}

// Search only: the folders now do the filtering. Searching stays inside the open folder.
export default function ApplicationFilters({ q, folder }: Props) {
  return (
    <form className="filter-form toolbar" method="get" action="/applications">
      {folder !== 'all' ? <input type="hidden" name="folder" value={folder} /> : null}
      <input
        type="search"
        name="q"
        defaultValue={q}
        placeholder="Search name, email, country…"
        aria-label="Search applicants"
      />
      <button type="submit" className="btn-ghost">
        Search
      </button>
      {q ? (
        <Link
          href={folder === 'all' ? '/applications' : `/applications?folder=${folder}`}
          className="filter-clear"
        >
          Clear search
        </Link>
      ) : null}
    </form>
  )
}
