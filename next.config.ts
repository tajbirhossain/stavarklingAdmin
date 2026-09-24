import type { NextConfig } from 'next'
import { loadEnvConfig } from '@next/env'
import fs from 'fs'
import path from 'path'

function loadEnvFile(filePath: string, { override = false } = {}) {
  if (!fs.existsSync(filePath)) return
  const text = fs.readFileSync(filePath, 'utf8')
  for (const rawLine of text.split(/\r?\n/)) {
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
    if (override || process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

const siteDir = path.join(__dirname, '..', 'stavarkling')
const adminDir = __dirname

// 1) Real site credentials (DATABASE_URL, etc.)
loadEnvConfig(siteDir)
loadEnvFile(path.join(siteDir, '.env'))
loadEnvFile(path.join(siteDir, '.env.local'), { override: true })

// 2) Admin secrets override (session secret, bootstrap password)
loadEnvFile(path.join(adminDir, '.env'))
loadEnvFile(path.join(adminDir, '.env.local'), { override: true })

const nextConfig: NextConfig = {}

export default nextConfig
