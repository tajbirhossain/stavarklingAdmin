import { NextResponse } from 'next/server'
import {
  loginWithPassword,
  sessionCookieOptions,
} from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const password = body && typeof body.password === 'string' ? body.password : ''

    const result = await loginWithPassword(password, request)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const response = NextResponse.json({ ok: true })
    response.cookies.set(sessionCookieOptions(result.cookie, result.expiresAt))
    return response
  } catch (err) {
    console.error('login route error', err)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
