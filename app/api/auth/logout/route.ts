import { NextResponse } from 'next/server'
import { clearSessionCookieOptions, revokeCurrentSession } from '@/lib/auth'

export async function POST() {
  await revokeCurrentSession()
  const response = NextResponse.json({ ok: true })
  response.cookies.set(clearSessionCookieOptions())
  return response
}
