'use client'

import { useState } from 'react'

const MIN_LENGTH = 12

export default function ChangePasswordForm() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const tooShort = next.length > 0 && next.length < MIN_LENGTH
  const mismatch = confirm.length > 0 && confirm !== next
  const canSubmit =
    current.length > 0 && next.length >= MIN_LENGTH && confirm === next && !busy

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setBusy(true)
    setError(null)
    setDone(false)
    try {
      const res = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Could not update the password.')
        return
      }
      setCurrent('')
      setNext('')
      setConfirm('')
      setDone(true)
    } catch {
      setError('Network error — check your connection and try again')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="password-form" onSubmit={submit}>
      <label className="field">
        <span>Current password</span>
        <input
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          disabled={busy}
        />
      </label>

      <label className="field">
        <span>New password</span>
        <input
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          disabled={busy}
          aria-invalid={tooShort}
        />
        <small className={tooShort ? 'field-hint field-hint-bad' : 'field-hint'}>
          At least {MIN_LENGTH} characters. A short phrase of several words works well.
        </small>
      </label>

      <label className="field">
        <span>Confirm new password</span>
        <input
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          disabled={busy}
          aria-invalid={mismatch}
        />
        {mismatch ? <small className="field-hint field-hint-bad">Passwords do not match.</small> : null}
      </label>

      <button type="submit" className="btn-primary" disabled={!canSubmit}>
        {busy ? 'Updating…' : 'Update password'}
      </button>

      {done ? (
        <p className="form-success" role="status">
          ✓ Password updated. Other devices have been signed out.
        </p>
      ) : null}
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  )
}
