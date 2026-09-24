import { createHash, createHmac, randomBytes } from 'crypto'
import { cookies } from 'next/headers'
import { COOKIE_NAME } from '@/lib/constants'
import { hasDatabaseUrl, withClient, withTransaction } from '@/lib/db'
import { hashPassword, verifyPasswordHash } from '@/lib/password'
import {
  clearSessionCookieOptions,
  decodeSessionCookie,
  encodeSessionCookie,
  sessionCookieOptions,
} from '@/lib/sessionCookie'

export { clearSessionCookieOptions, sessionCookieOptions }

export const SESSION_TTL_MS = 1000 * 60 * 60 * 12
export const MAX_FAILED_LOGINS = 5
export const LOCKOUT_MS = 1000 * 60 * 15

export type AdminSession = {
  sessionId: string
  adminId: string
  username: string
}

function getSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret || secret.length < 16) {
    throw new Error(
      'ADMIN_SESSION_SECRET is missing or too short (min 16 chars). Add it to admin-panel/.env.local.'
    )
  }
  return secret
}

export function hashToken(token: string) {
  return createHmac('sha256', getSessionSecret()).update(token).digest('hex')
}

export function hashRequestBody(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value ?? null)).digest('hex')
}

function clientIp(request?: Request) {
  if (!request) return null
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || null
  return request.headers.get('x-real-ip')
}

export async function countAdminAccounts() {
  if (!hasDatabaseUrl()) return 0
  const result = await withClient(async (client) => {
    return client.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM admin_accounts')
  })
  return Number(result.rows[0]?.count ?? 0)
}

export async function ensureBootstrapAdmin(password: string) {
  if (!hasDatabaseUrl()) return { created: false as const }
  return withTransaction(async (client) => {
    const existing = await client.query<{ id: string }>(
      'SELECT id FROM admin_accounts LIMIT 1 FOR UPDATE'
    )
    if (existing.rows[0]) return { created: false as const }

    const bootstrap = process.env.ADMIN_BOOTSTRAP_PASSWORD
    if (!bootstrap || bootstrap !== password) {
      return { created: false as const }
    }

    const inserted = await client.query<{ id: string }>(
      `INSERT INTO admin_accounts (username, password_hash)
       VALUES ('admin', $1)
       RETURNING id`,
      [hashPassword(password)]
    )
    return { created: true as const, adminId: inserted.rows[0].id }
  })
}

export type LoginResult =
  | { ok: true; cookie: string; expiresAt: Date }
  | { ok: false; error: string; status: 401 | 423 | 503 }

export async function loginWithPassword(
  password: string,
  request?: Request
): Promise<LoginResult> {
  if (!password || password.length > 200) {
    return { ok: false, error: 'Incorrect password', status: 401 }
  }

  if (!hasDatabaseUrl()) {
    return {
      ok: false,
      error:
        'DATABASE_URL is not available. Add it to admin-panel/.env.local.',
      status: 503,
    }
  }

  if (!process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET.length < 16) {
    return {
      ok: false,
      error: 'ADMIN_SESSION_SECRET is not configured in admin-panel/.env.local',
      status: 503,
    }
  }

  try {
    await ensureBootstrapAdmin(password)

    return await withTransaction(async (client) => {
      const accountResult = await client.query<{
        id: string
        username: string
        password_hash: string
        failed_login_count: number
        locked_until: Date | null
      }>(
        `SELECT id, username, password_hash, failed_login_count, locked_until
         FROM admin_accounts
         WHERE username = 'admin'
         LIMIT 1
         FOR UPDATE`
      )

      const account = accountResult.rows[0]
      if (!account) {
        return {
          ok: false as const,
          error:
            'Admin account is not set up. Set ADMIN_BOOTSTRAP_PASSWORD and sign in once, or run npm run admin:set-password.',
          status: 503 as const,
        }
      }

      if (account.locked_until && account.locked_until.getTime() > Date.now()) {
        return {
          ok: false as const,
          error: 'Too many failed attempts. Try again later.',
          status: 423 as const,
        }
      }

      const valid = verifyPasswordHash(password, account.password_hash)
      if (!valid) {
        const fails = account.failed_login_count + 1
        const lockedUntil =
          fails >= MAX_FAILED_LOGINS ? new Date(Date.now() + LOCKOUT_MS) : null
        await client.query(
          `UPDATE admin_accounts
           SET failed_login_count = $1,
               locked_until = $2,
               updated_at = now()
           WHERE id = $3`,
          [fails, lockedUntil, account.id]
        )
        return {
          ok: false as const,
          error: lockedUntil
            ? 'Too many failed attempts. Try again later.'
            : 'Incorrect password',
          status: (lockedUntil ? 423 : 401) as 401 | 423,
        }
      }

      await client.query(
        `UPDATE admin_accounts
         SET failed_login_count = 0,
             locked_until = NULL,
             updated_at = now()
         WHERE id = $1`,
        [account.id]
      )

      const token = randomBytes(32).toString('base64url')
      const tokenHash = hashToken(token)
      const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
      const ip = clientIp(request)
      const userAgent = request?.headers.get('user-agent') ?? null

      const session = await client.query<{ id: string }>(
        `INSERT INTO admin_sessions (
           admin_id, token_hash, expires_at, request_ip, user_agent
         ) VALUES ($1, $2, $3, $4::inet, $5)
         RETURNING id`,
        [account.id, tokenHash, expiresAt, ip, userAgent]
      )

      const cookie = await encodeSessionCookie({
        sessionId: session.rows[0].id,
        token,
        expiresAt,
      })

      return { ok: true as const, cookie, expiresAt }
    })
  } catch (err) {
    console.error('admin login failed', err)
    const message =
      err instanceof Error && err.message.includes('admin_accounts')
        ? 'Admin tables are missing. Run db/migrations/006_admin_auth.sql in Supabase.'
        : 'Login temporarily unavailable'
    return { ok: false, error: message, status: 503 }
  }
}

export async function getSessionFromCookie(
  raw: string | undefined | null
): Promise<AdminSession | null> {
  const decoded = await decodeSessionCookie(raw)
  if (!decoded) return null
  if (!hasDatabaseUrl()) return null

  try {
    const tokenHash = hashToken(decoded.token)
    return await withClient(async (client) => {
      const result = await client.query<{
        id: string
        admin_id: string
        username: string
      }>(
        `SELECT s.id, s.admin_id, a.username
         FROM admin_sessions s
         JOIN admin_accounts a ON a.id = s.admin_id
         WHERE s.id = $1
           AND s.token_hash = $2
           AND s.revoked_at IS NULL
           AND s.expires_at > now()
         LIMIT 1`,
        [decoded.sessionId, tokenHash]
      )

      const row = result.rows[0]
      if (!row) return null

      await client.query(
        `UPDATE admin_sessions SET last_seen_at = now() WHERE id = $1`,
        [row.id]
      )

      return {
        sessionId: row.id,
        adminId: row.admin_id,
        username: row.username,
      }
    })
  } catch {
    return null
  }
}

export async function getCurrentSession() {
  const jar = await cookies()
  return getSessionFromCookie(jar.get(COOKIE_NAME)?.value)
}

export async function revokeCurrentSession() {
  const jar = await cookies()
  const raw = jar.get(COOKIE_NAME)?.value
  const decoded = await decodeSessionCookie(raw)
  if (!decoded || !hasDatabaseUrl()) return

  try {
    await withClient(async (client) => {
      await client.query(
        `UPDATE admin_sessions
         SET revoked_at = now()
         WHERE id = $1 AND revoked_at IS NULL`,
        [decoded.sessionId]
      )
    })
  } catch {
    // ignore
  }
}
