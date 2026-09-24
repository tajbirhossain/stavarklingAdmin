import nextEnv from '@next/env'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const { loadEnvConfig } = nextEnv

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

loadEnvConfig(root)

console.log(
  JSON.stringify(
    {
      DATABASE_URL: Boolean(process.env.DATABASE_URL?.trim()),
      ADMIN_SESSION_SECRET: Boolean(process.env.ADMIN_SESSION_SECRET?.trim()),
      ADMIN_BOOTSTRAP_PASSWORD: Boolean(
        process.env.ADMIN_BOOTSTRAP_PASSWORD?.trim()
      ),
    },
    null,
    2
  )
)
