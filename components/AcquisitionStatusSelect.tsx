'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  ACQUISITION_STATUSES,
  ACQUISITION_STATUS_LABELS,
  type AcquisitionStatus,
} from '@/lib/acquisitionStatus'

export default function AcquisitionStatusSelect({
  id,
  status,
}: {
  id: string
  status: AcquisitionStatus
}) {
  const router = useRouter()
  const [value, setValue] = useState(status)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function change(next: AcquisitionStatus) {
    const previous = value
    setValue(next)
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/acquisitions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error || 'Update failed')
      }
      router.refresh()
    } catch (err) {
      setValue(previous)
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <select
        value={value}
        disabled={busy}
        onChange={(e) => change(e.target.value as AcquisitionStatus)}
        aria-label="Enquiry status"
      >
        {ACQUISITION_STATUSES.map((s) => (
          <option key={s} value={s}>
            {ACQUISITION_STATUS_LABELS[s]}
          </option>
        ))}
      </select>
      {error ? <p className="cell-muted">{error}</p> : null}
    </div>
  )
}
