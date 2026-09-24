import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { COOKIE_NAME } from '@/lib/constants'
import { getCurrentSession, type AdminSession } from '@/lib/auth'

export async function requireAdminSession(): Promise<
  | { ok: true; session: AdminSession }
  | { ok: false; response: NextResponse }
> {
  const session = await getCurrentSession()
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }
  return { ok: true, session }
}

export async function requirePageSession() {
  const session = await getCurrentSession()
  if (!session) return null
  return session
}

export function getIdempotencyKey(request: Request) {
  const key = request.headers.get('idempotency-key')?.trim()
  if (!key) return null
  if (key.length < 8 || key.length > 128) return null
  return key
}

export async function readCookieToken() {
  const jar = await cookies()
  return jar.get(COOKIE_NAME)?.value
}
