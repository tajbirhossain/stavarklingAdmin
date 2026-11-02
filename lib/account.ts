import { withClient, withTransaction } from '@/lib/db'
import { LOCKOUT_MS, MAX_FAILED_LOGINS, SESSION_TTL_MS } from '@/lib/auth'
import { hashPassword, verifyPasswordHash } from '@/lib/password'

export const MIN_PASSWORD_LENGTH = 12

export const SECURITY_POLICY = {
  sessionHours: Math.round(SESSION_TTL_MS / 3_600_000),
  maxFailedLogins: MAX_FAILED_LOGINS,
  lockoutMinutes: Math.round(LOCKOUT_MS / 60_000),
}

export type AccountOverview = {
  username: string
  sessionStartedAt: string
  sessionExpiresAt: string
  lastSeenAt: string
  otherActiveSessions: number
}

export async function getAccountOverview(
  adminId: string,
  sessionId: string
): Promise<AccountOverview | null> {
  return withClient(async (client) => {
    const current = await client.query<{
      username: string
      created_at: Date
      expires_at: Date
      last_seen_at: Date
    }>(
      `SELECT a.username, s.created_at, s.expires_at, s.last_seen_at
       FROM admin_sessions s
       JOIN admin_accounts a ON a.id = s.admin_id
       WHERE s.id = $1 AND s.admin_id = $2
       LIMIT 1`,
      [sessionId, adminId]
    )
    const row = current.rows[0]
    if (!row) return null

    const others = await client.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM admin_sessions
       WHERE admin_id = $1
         AND id <> $2
         AND revoked_at IS NULL
         AND expires_at > now()`,
      [adminId, sessionId]
    )

    return {
      username: row.username,
      sessionStartedAt: row.created_at.toISOString(),
      sessionExpiresAt: row.expires_at.toISOString(),
      lastSeenAt: row.last_seen_at.toISOString(),
      otherActiveSessions: Number(others.rows[0]?.count ?? 0),
    }
  })
}

export async function revokeOtherSessions(adminId: string, sessionId: string) {
  return withClient(async (client) => {
    const result = await client.query(
      `UPDATE admin_sessions
       SET revoked_at = now()
       WHERE admin_id = $1
         AND id <> $2
         AND revoked_at IS NULL`,
      [adminId, sessionId]
    )
    return result.rowCount ?? 0
  })
}

export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; error: string; status: 400 | 401 | 404 }

export async function changePassword(
  adminId: string,
  sessionId: string,
  currentPassword: string,
  newPassword: string
): Promise<ChangePasswordResult> {
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      status: 400,
    }
  }
  if (newPassword.length > 200) {
    return { ok: false, error: 'New password is too long.', status: 400 }
  }
  if (newPassword === currentPassword) {
    return {
      ok: false,
      error: 'New password must be different from the current one.',
      status: 400,
    }
  }

  return withTransaction(async (client) => {
    const result = await client.query<{ password_hash: string }>(
      `SELECT password_hash FROM admin_accounts WHERE id = $1 FOR UPDATE`,
      [adminId]
    )
    const account = result.rows[0]
    if (!account) {
      return { ok: false as const, error: 'Account not found.', status: 404 as const }
    }

    if (!verifyPasswordHash(currentPassword, account.password_hash)) {
      return {
        ok: false as const,
        error: 'Current password is incorrect.',
        status: 401 as const,
      }
    }

    await client.query(
      `UPDATE admin_accounts
       SET password_hash = $1,
           failed_login_count = 0,
           locked_until = NULL,
           updated_at = now()
       WHERE id = $2`,
      [hashPassword(newPassword), adminId]
    )

    // A new password signs out every other device.
    await client.query(
      `UPDATE admin_sessions
       SET revoked_at = now()
       WHERE admin_id = $1 AND id <> $2 AND revoked_at IS NULL`,
      [adminId, sessionId]
    )

    return { ok: true as const }
  })
}
