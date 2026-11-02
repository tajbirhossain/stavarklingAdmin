import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { COOKIE_NAME } from '@/lib/constants'
import { verifySessionCookieShape } from '@/lib/sessionCookie'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isLogin = pathname === '/login'
  const isAuthApi =
    pathname.startsWith('/api/auth/login') || pathname.startsWith('/api/auth/logout')
  const isPublic = isLogin || isAuthApi
  const isApi = pathname.startsWith('/api/')

  const token = request.cookies.get(COOKIE_NAME)?.value
  let authed = false
  try {
    authed = await verifySessionCookieShape(token)
  } catch {
    authed = false
  }

  if (!authed && !isPublic) {
    if (isApi) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  if (authed && isLogin) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.png|lotus-icon-logo.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
