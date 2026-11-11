'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import Avatar from '@/components/Avatar'
import StageBadge from '@/components/StageBadge'
import StatusBadge from '@/components/StatusBadge'
import { applicantComposeHref } from '@/lib/composeMail'
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
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const keysRef = useRef<Record<string, string>>({})

  function keyFor(id: string) {
    if (!keysRef.current[id]) keysRef.current[id] = newIdempotencyKey()
    return keysRef.current[id]
  }

  async function advance(id: string) {
    setBusyId(id)
    setError(null)
    setNotice(null)
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
      if (data.toStage === 3 && !data.alreadyAdvanced) {
        if (data.emailSent) {
          setNotice('Approved. The invitation email has been sent.')
        } else {
          setError(
            `Approved, but the invitation email could not be sent${
              data.emailError ? ` (${data.emailError})` : ''
            }. Use "Send email" to invite them manually.`
          )
        }
      }
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
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="result-count" role="status">
          {notice}
        </p>
      ) : null}
      {requests.map((req) => {
        const canAdvance = req.currentStage < 3
        return (
          <article key={req.id} className="request-card panel">
            <div className="request-main">
              <div className="cell-person">
                <Avatar name={req.fullName} />
                <div className="request-identity">
                  <h3>{req.fullName}</h3>
                  <p>{req.email}</p>
                </div>
              </div>
              <div className="request-meta">
                <StatusBadge status={req.status} />
                <StageBadge stage={req.currentStage} />
                <span className="cell-muted">Requested {formatRelative(req.requestedAt)}</span>
              </div>
              <p className="request-copy">
                {req.fromStage === 2
                  ? 'Requested access to The Decision.'
                  : req.fromStage < 3
                    ? `Asked to move beyond stage ${req.fromStage}.`
                    : 'Requested private acquisition at the final stage.'}
              </p>
            </div>
            <div className="request-actions">
              <Link href={`/applications/${req.applicationId}`} className="btn-ghost">
                View profile
              </Link>
              <Link
                href={applicantComposeHref(req.email, req.fullName)}
                className="btn-ghost"
              >
                Send email
              </Link>
              {canAdvance && confirmId === req.id ? (
                <div className="confirm-box" role="alertdialog" aria-label="Confirm advance">
                  <p className="confirm-text">
                    Grant {req.fullName.split(' ')[0]} access to stage {req.currentStage + 1}?
                    {req.currentStage === 2 ? ' They will be emailed an invitation.' : ''}
                  </p>
                  <div className="confirm-buttons">
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={busyId === req.id}
                      onClick={async () => {
                        await advance(req.id)
                        setConfirmId(null)
                      }}
                    >
                      {busyId === req.id ? 'Advancing…' : 'Yes, advance'}
                    </button>
                    <button
                      type="button"
                      className="btn-ghost"
                      disabled={busyId === req.id}
                      onClick={() => setConfirmId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : canAdvance ? (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setConfirmId(req.id)}
                >
                  Advance stage
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
