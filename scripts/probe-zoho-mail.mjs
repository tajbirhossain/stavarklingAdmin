import nextEnv from '@next/env'
import path from 'path'
import { fileURLToPath } from 'url'

const { loadEnvConfig } = nextEnv
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
loadEnvConfig(root)

const REQUIRED = ['ZOHO_CLIENT_ID', 'ZOHO_CLIENT_SECRET', 'ZOHO_REFRESH_TOKEN']
const missing = REQUIRED.filter((k) => !process.env[k]?.trim())
const fromEmail = process.env.ZOHO_FROM_EMAIL?.trim() || 'private@stavarkling.com'
const accountsUrl =
  process.env.ZOHO_ACCOUNTS_URL?.trim() || 'https://accounts.zoho.com'
const mailApiUrl =
  process.env.ZOHO_MAIL_API_URL?.trim() || 'https://mail.zoho.com'

if (missing.length) {
  console.log(
    JSON.stringify(
      {
        ok: false,
        error: `Missing env: ${missing.join(', ')}`,
        hint: 'Add Self Client credentials to admin-panel/.env.local',
      },
      null,
      2
    )
  )
  process.exit(1)
}

async function main() {
  const tokenRes = await fetch(`${accountsUrl}/oauth/v2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: process.env.ZOHO_REFRESH_TOKEN.trim(),
      client_id: process.env.ZOHO_CLIENT_ID.trim(),
      client_secret: process.env.ZOHO_CLIENT_SECRET.trim(),
      grant_type: 'refresh_token',
    }).toString(),
  })
  const tokenJson = await tokenRes.json().catch(() => ({}))
  if (!tokenRes.ok || !tokenJson.access_token) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          step: 'token',
          error:
            tokenJson.error_description ||
            tokenJson.error ||
            `HTTP ${tokenRes.status}`,
        },
        null,
        2
      )
    )
    process.exit(1)
  }

  const headers = {
    Accept: 'application/json',
    Authorization: `Zoho-oauthtoken ${tokenJson.access_token}`,
  }

  const accountsRes = await fetch(`${mailApiUrl}/api/accounts`, { headers })
  const accountsJson = await accountsRes.json().catch(() => ({}))
  const accounts = Array.isArray(accountsJson.data)
    ? accountsJson.data
    : accountsJson.data?.accounts || []

  if (!accountsRes.ok || !accounts.length) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          step: 'accounts',
          status: accountsRes.status,
          body: accountsJson,
        },
        null,
        2
      )
    )
    process.exit(1)
  }

  const target = fromEmail.toLowerCase()
  const match =
    accounts.find((a) => {
      const mailbox = String(a.mailboxAddress || '').toLowerCase()
      const primary = String(a.primaryEmailAddress || '').toLowerCase()
      return mailbox === target || primary === target
    }) || accounts[0]

  const accountId = process.env.ZOHO_ACCOUNT_ID?.trim() || String(match.accountId)

  const foldersRes = await fetch(
    `${mailApiUrl}/api/accounts/${accountId}/folders`,
    { headers }
  )
  const foldersJson = await foldersRes.json().catch(() => ({}))
  const folders = Array.isArray(foldersJson.data) ? foldersJson.data : []
  const inbox = folders.find(
    (f) =>
      String(f.folderType || '').toLowerCase() === 'inbox' || f.path === '/Inbox'
  )

  if (!foldersRes.ok || !inbox) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          step: 'folders',
          accountId,
          status: foldersRes.status,
          body: foldersJson,
        },
        null,
        2
      )
    )
    process.exit(1)
  }

  const listRes = await fetch(
    `${mailApiUrl}/api/accounts/${accountId}/messages/view?folderId=${inbox.folderId}&start=1&limit=5&includeto=true`,
    { headers }
  )
  const listJson = await listRes.json().catch(() => ({}))
  const messages = Array.isArray(listJson.data) ? listJson.data : []

  console.log(
    JSON.stringify(
      {
        ok: listRes.ok,
        fromEmail,
        accountId,
        inboxFolderId: String(inbox.folderId),
        inboxCountSample: messages.length,
        subjects: messages.map((m) => m.subject || '(no subject)'),
        note: listRes.ok
          ? 'Zoho Mail API works on this account (no IMAP needed).'
          : 'List messages failed — see body',
        listStatus: listRes.status,
        listError: listRes.ok ? undefined : listJson,
      },
      null,
      2
    )
  )
  process.exit(listRes.ok ? 0 : 1)
}

main().catch((err) => {
  console.log(JSON.stringify({ ok: false, error: String(err) }, null, 2))
  process.exit(1)
})
