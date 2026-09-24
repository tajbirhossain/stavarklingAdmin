'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import StageBadge from '@/components/StageBadge'
import StatusBadge from '@/components/StatusBadge'
import { formatRelative } from '@/lib/format'
import type { StageRequest } from '@/lib/types'

function newIdempotencyKey() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export default function StageRequestsList({ requests }: { requests: StageRequest[] }) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const keysRef = useRef<Record<string, string>>({})

  function keyFor(id: string) {
    if (!keysRef.current[id]) keysRef.current[id] = newIdempotencyKey()
    return keysRef.current[id]
  }

  async function advance(id: string) {
    setBusyId(id)
    setError(null)
    try {
      const res = await fetch(`/api/stage-requests/${id}/advance`, {
        method: 'POST',
        headers: { 'Idempotency-Key': keyFor(id) },
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Could not advance stage')
        if (res.status === 409) keysRef.current[id] = newIdempotencyKey()
        return
      }
      keysRef.current[id] = newIdempotencyKey()
      router.refresh()
    } catch {
      setError('Network error — check your connection and try again')
    } finally {
      setBusyId(null)
    }
  }

  if (requests.length === 0) {
    return (
      <div className="empty-state">
        <p className="empty-title font-display">No open stage requests</p>
        <p className="empty-text">
          When approved members request the next stage, they will show up here.
        </p>
      </div>
    )
  }

  return (
    <div className="request-list">
      {error ? <p className="form-error">{error}</p> : null}
      {requests.map((req) => {
        const canAdvance = req.currentStage < 3
        return (
          <article key={req.id} className="request-card panel">
            <div className="request-main">
              <div className="request-identity">
                <h3>{req.fullName}</h3>
                <p>{req.email}</p>
              </div>
              <div className="request-meta">
                <StatusBadge status={req.status} />
                <StageBadge stage={req.currentStage} />
                <span className="cell-muted">Requested {formatRelative(req.requestedAt)}</span>
              </div>
              <p className="request-copy">
                {req.fromStage < 3
                  ? `Asked to move beyond stage ${req.fromStage}.`
                  : 'Requested private acquisition at the final stage.'}
              </p>
            </div>
            <div className="request-actions">
              <Link href={`/applications/${req.applicationId}`} className="btn-ghost">
                View profile
              </Link>
              {canAdvance ? (
                <button
                  type="button"
                  className="btn-primary"
                  disabled={busyId === req.id}
                  onClick={() => advance(req.id)}
                >
                  {busyId === req.id ? 'Advancing…' : 'Advance stage'}
                </button>
              ) : (
                <span className="request-chip">Final stage</span>
              )}
            </div>
          </article>
        )
      })}
    </div>
  )
}
