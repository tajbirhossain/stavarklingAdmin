import nextEnv from '@next/env'
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
      ZOHO_CLIENT_ID: Boolean(process.env.ZOHO_CLIENT_ID?.trim()),
      ZOHO_CLIENT_SECRET: Boolean(process.env.ZOHO_CLIENT_SECRET?.trim()),
      ZOHO_REFRESH_TOKEN: Boolean(process.env.ZOHO_REFRESH_TOKEN?.trim()),
      ZOHO_FROM_EMAIL: Boolean(process.env.ZOHO_FROM_EMAIL?.trim()),
    },
    null,
    2
  )
)
