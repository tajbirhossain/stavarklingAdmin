import { NextResponse } from 'next/server'
import { revokeOtherSessions } from '@/lib/account'
import { requireAdminSession } from '@/lib/requireAdmin'

export async function POST() {
  const auth = await requireAdminSession()
  if (!auth.ok) return auth.response

  try {
    const revoked = await revokeOtherSessions(auth.session.adminId, auth.session.sessionId)
    return NextResponse.json({ ok: true, revoked })
  } catch (err) {
    console.error('revoke other sessions failed', err)
    return NextResponse.json({ error: 'Could not sign out other devices.' }, { status: 500 })
  }
}
