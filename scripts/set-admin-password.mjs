import nextEnv from '@next/env'
import { createHash, randomBytes, scryptSync } from 'crypto'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const { loadEnvConfig } = nextEnv

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

loadEnvConfig(root)

const password = process.argv[2]
if (!password || password.length < 8) {
  console.error('Usage: npm run admin:set-password -- "your-password-min-8"')
  process.exit(1)
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is missing in admin-panel/.env.local')
  process.exit(1)
}

const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1
const KEY_LEN = 64

function hashPassword(value) {
  const salt = randomBytes(16)
  const hash = scryptSync(value, salt, KEY_LEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  })
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('hex')}$${hash.toString('hex')}`
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
})

try {
  const passwordHash = hashPassword(password)
  const result = await pool.query(
    `INSERT INTO admin_accounts (username, password_hash)
     VALUES ('admin', $1)
     ON CONFLICT (username) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           failed_login_count = 0,
           locked_until = NULL,
           updated_at = now()
     RETURNING id, username`,
    [passwordHash]
  )
  const fingerprint = createHash('sha256')
    .update(passwordHash)
    .digest('hex')
    .slice(0, 10)
  console.log(
    `Admin password updated for "${result.rows[0].username}" (hash fingerprint ${fingerprint}).`
  )
  console.log('Remember to revoke old sessions if this was a rotation.')
} catch (err) {
  console.error('Failed to set admin password.')
  console.error(err instanceof Error ? err.message : err)
  console.error('Did you run db/migrations/006_admin_auth.sql?')
  process.exitCode = 1
} finally {
  await pool.end()
}
