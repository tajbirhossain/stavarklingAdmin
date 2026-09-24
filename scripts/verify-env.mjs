import nextEnv from '@next/env'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

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
loadEnvFile(path.join(root, '.env'))
loadEnvFile(path.join(root, '.env.local'), { override: true })

console.log(
  JSON.stringify(
    {
      DATABASE_URL: Boolean(process.env.DATABASE_URL?.trim()),
      ADMIN_SESSION_SECRET: Boolean(process.env.ADMIN_SESSION_SECRET?.trim()),
      ADMIN_BOOTSTRAP_PASSWORD: Boolean(process.env.ADMIN_BOOTSTRAP_PASSWORD?.trim()),
    },
    null,
    2
  )
)
