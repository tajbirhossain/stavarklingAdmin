'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { STATUS_OPTIONS, STAGE_LABELS } from '@/lib/constants'
import type { AccessStage, Application, ApplicationStatus } from '@/lib/types'

function newIdempotencyKey() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export default function ApplicationActions({
  application,
}: {
  application: Application
}) {
  const router = useRouter()
  const [status, setStatus] = useState<ApplicationStatus>(application.status)
  const [stage, setStage] = useState<AccessStage>(application.accessStage)
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState(application.updatedAt)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const idempotencyKeyRef = useRef(newIdempotencyKey())

  useEffect(() => {
    setStatus(application.status)
    setStage(application.accessStage)
    setExpectedUpdatedAt(application.updatedAt)
  }, [application.id, application.status, application.accessStage, application.updatedAt])

  async function save() {
    setBusy(true)
    setMessage(null)
    setError(null)
    try {
      const res = await fetch(`/api/applications/${application.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKeyRef.current,
        },
        body: JSON.stringify({
          status,
          accessStage: stage,
          expectedUpdatedAt,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(
          typeof data.error === 'string' ? data.error : 'Could not save changes'
        )
        idempotencyKeyRef.current = newIdempotencyKey()
        if (res.status === 409) {
          router.refresh()
        }
        return
      }

      const saved = data.application as Application | undefined
      if (!saved) {
        setError('Save returned an empty response')
        idempotencyKeyRef.current = newIdempotencyKey()
        return
      }

      setExpectedUpdatedAt(saved.updatedAt)
      setStatus(saved.status)
      setStage(saved.accessStage)
      idempotencyKeyRef.current = newIdempotencyKey()
      setMessage('Changes saved')
      router.refresh()
    } catch {
      setError('Network error — check your connection and try again')
      idempotencyKeyRef.current = newIdempotencyKey()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="action-panel">
      <div className="action-panel-head">
        <h2 className="panel-title font-display">Manage access</h2>
        <p className="panel-sub">Update review status or advance their journey stage.</p>
      </div>

      <label className="field">
        <span>Status</span>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
          disabled={busy}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Access stage</span>
        <select
          value={stage}
          onChange={(e) => setStage(Number(e.target.value) as AccessStage)}
          disabled={busy}
        >
          {([1, 2, 3] as AccessStage[]).map((s) => (
            <option key={s} value={s}>
              {STAGE_LABELS[s].number} — {STAGE_LABELS[s].title}
            </option>
          ))}
        </select>
      </label>

      <button type="button" className="btn-primary" onClick={save} disabled={busy}>
        {busy ? 'Saving…' : 'Save changes'}
      </button>

      {message ? <p className="form-success">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  )
}
