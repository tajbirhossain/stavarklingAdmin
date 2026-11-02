'use client'

import Link from 'next/link'
import { useRef } from 'react'

type Props = {
  q: string
  status: string
  stage: string
}

export default function ApplicationFilters({ q, status, stage }: Props) {
  const formRef = useRef<HTMLFormElement>(null)
  const hasFilters = Boolean(q) || status !== 'all' || stage !== 'all'

  function submit() {
    formRef.current?.requestSubmit()
  }

  return (
    <form ref={formRef} className="filter-form toolbar" method="get">
      <input
        type="search"
        name="q"
        defaultValue={q}
        placeholder="Search name, email, country…"
        aria-label="Search applicants"
      />
      <select name="status" defaultValue={status} onChange={submit} aria-label="Filter by status">
        <option value="all">All statuses</option>
        <option value="pending">Pending</option>
        <option value="under_review">Under review</option>
        <option value="approved">Approved</option>
        <option value="rejected">Rejected</option>
        <option value="withdrawn">Withdrawn</option>
      </select>
      <select name="stage" defaultValue={stage} onChange={submit} aria-label="Filter by stage">
        <option value="all">All stages</option>
        <option value="1">Stage 1</option>
        <option value="2">Stage 2</option>
        <option value="3">Stage 3</option>
      </select>
      <button type="submit" className="btn-ghost">
        Search
      </button>
      {hasFilters ? (
        <Link href="/applications" className="filter-clear">
          Clear filters
        </Link>
      ) : null}
    </form>
  )
}
