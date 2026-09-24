import nextEnv from '@next/env'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const { loadEnvConfig } = nextEnv

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const siteDir = path.join(root, '..', 'stavarkling')

function loadEnvFile(filePath, { override = false } = {}) {
  if (!fs.existsSync(filePath)) return
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (override || process.env[key] === undefined) process.env[key] = value
  }
}

loadEnvConfig(siteDir)
loadEnvFile(path.join(siteDir, '.env'))
loadEnvFile(path.join(siteDir, '.env.local'), { override: true })
loadEnvFile(path.join(root, '.env.local'), { override: true })

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL missing')
  process.exit(1)
}

const sqlPath = path.join(root, 'db', 'migrations', '006_admin_auth.sql')
const sql = fs.readFileSync(sqlPath, 'utf8')

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
})

try {
  await pool.query(sql)
  const apps = await pool.query('SELECT COUNT(*)::int AS count FROM access_applications')
  const admins = await pool.query(
    `SELECT COUNT(*)::int AS count FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'admin_accounts'`
  )
  console.log(
    JSON.stringify(
      {
        migrationApplied: true,
        accessApplications: apps.rows[0].count,
        adminAccountsTablePresent: admins.rows[0].count === 1,
      },
      null,
      2
    )
  )
} catch (err) {
  console.error('Migration failed:', err instanceof Error ? err.message : err)
  process.exitCode = 1
} finally {
  await pool.end()
}
