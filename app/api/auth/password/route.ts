import { NextResponse } from 'next/server'
import { changePassword } from '@/lib/account'
import { requireAdminSession } from '@/lib/requireAdmin'

export async function POST(request: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) return auth.response

  try {
    const body = await request.json().catch(() => null)
    const currentPassword =
      body && typeof body.currentPassword === 'string' ? body.currentPassword : ''
    const newPassword = body && typeof body.newPassword === 'string' ? body.newPassword : ''

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Both passwords are required.' }, { status: 400 })
    }

    const result = await changePassword(
      auth.session.adminId,
      auth.session.sessionId,
      currentPassword,
      newPassword
    )
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('change password failed', err)
    return NextResponse.json({ error: 'Could not update the password.' }, { status: 500 })
  }
}
