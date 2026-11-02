'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function SignOutOthersButton({ count }: { count: number }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function run() {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch('/api/auth/sessions/revoke-others', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Could not sign out other devices.')
        return
      }
      setMessage('✓ Other devices signed out')
      router.refresh()
    } catch {
      setError('Network error — check your connection and try again')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="signout-others">
      <button
        type="button"
        className="btn-ghost"
        onClick={run}
        disabled={busy || count === 0}
      >
        {busy ? 'Signing out…' : 'Sign out other devices'}
      </button>
      {message ? (
        <p className="form-success" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
