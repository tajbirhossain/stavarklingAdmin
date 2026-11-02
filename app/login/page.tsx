import Image from 'next/image'
import { Suspense } from 'react'
import LoginForm from '@/components/LoginForm'

export const metadata = {
  title: 'Sign in',
}

export default function LoginPage() {
  return (
    <div className="login-page">
      <div className="panel login-card">
        <div className="login-brand">
          <Image src="/lotus-icon-logo.png" alt="Stavarkling" width={44} height={44} priority />
          <div>
            <h1 className="font-display">Stavarkling</h1>
            <p>Admin access</p>
          </div>
        </div>
        <p className="login-lead">Quiet operations for a selective journey.</p>
        <Suspense fallback={<p className="cell-muted">Loading…</p>}>
          <LoginForm />
        </Suspense>
        <p className="login-hint">
          Password is validated against the hashed value in Postgres (
          <code>admin_accounts</code>). First setup: set{' '}
          <code>ADMIN_BOOTSTRAP_PASSWORD</code> or run{' '}
          <code>npm run admin:set-password</code>.
        </p>
      </div>
    </div>
  )
}
