/**
 * Edge-safe session cookie helpers (Web Crypto).
 * Cookie format: v1.<sessionId>.<token>.<expMs>.<sig>
 */

import { COOKIE_NAME } from '@/lib/constants'

const encoder = new TextEncoder()

function getSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret || secret.length < 16) {
    throw new Error(
      'ADMIN_SESSION_SECRET is missing or too short (min 16 chars). Add it to admin-panel/.env.local.'
    )
  }
  return secret
}

function toBase64Url(bytes: ArrayBuffer | Uint8Array) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let binary = ''
  for (let i = 0; i < view.length; i += 1) binary += String.fromCharCode(view[i]!)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4))
  const binary = atob(padded + pad)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function getHmacKey() {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(getSessionSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

async function signPayload(payload: string) {
  const key = await getHmacKey()
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return toBase64Url(signature)
}

export async function encodeSessionCookie(input: {
  sessionId: string
  token: string
  expiresAt: Date
}) {
  const exp = String(input.expiresAt.getTime())
  const payload = `v1.${input.sessionId}.${input.token}.${exp}`
  const sig = await signPayload(payload)
  return `${payload}.${sig}`
}

export async function decodeSessionCookie(raw: string | undefined | null): Promise<{
  sessionId: string
  token: string
  exp: number
} | null> {
  if (!raw) return null
  const parts = raw.split('.')
  if (parts.length !== 5 || parts[0] !== 'v1') return null
  const [, sessionId, token, expRaw, signature] = parts
  if (!sessionId || !token || !expRaw || !signature) return null

  const payload = `v1.${sessionId}.${token}.${expRaw}`
  try {
    const key = await getHmacKey()
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      fromBase64Url(signature),
      encoder.encode(payload)
    )
    if (!valid) return null
  } catch {
    return null
  }

  const exp = Number(expRaw)
  if (!Number.isFinite(exp) || Date.now() > exp) return null
  return { sessionId, token, exp }
}

/** Fast proxy gate — signature + expiry only. */
export async function verifySessionCookieShape(raw: string | undefined | null) {
  return (await decodeSessionCookie(raw)) !== null
}

export function sessionCookieOptions(value: string, expiresAt: Date) {
  return {
    name: COOKIE_NAME,
    value,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  }
}

export function clearSessionCookieOptions() {
  return {
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  }
}
