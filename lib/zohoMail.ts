/**
 * Zoho Mail REST API — works without IMAP (needed on Zoho Free / web-only plans).
 * Auth: OAuth refresh token → access token (Authorization: Zoho-oauthtoken …).
 */

export type MailFolderKey = 'inbox' | 'sent'

export type MailMessageSummary = {
  messageId: string
  folderId: string
  subject: string
  summary: string
  fromAddress: string
  toAddress: string
  sender: string
  receivedTime: string | null
  sentDateInGMT: string | null
  hasAttachment: boolean
  status: string
}

export type MailConfigStatus = {
  configured: boolean
  missing: string[]
  fromEmail: string
  accountsUrl: string
  mailApiUrl: string
  accountIdSet: boolean
}

export class MailError extends Error {
  status: number
  constructor(message: string, status = 502) {
    super(message)
    this.name = 'MailError'
    this.status = status
  }
}

const REQUIRED_ENV = [
  'ZOHO_CLIENT_ID',
  'ZOHO_CLIENT_SECRET',
  'ZOHO_REFRESH_TOKEN',
] as const

const DEFAULT_FROM = 'private@stavarkling.com'

type TokenCache = {
  accessToken: string
  expiresAt: number
}

type FolderCache = {
  accountId: string
  inboxId: string
  sentId: string
  fetchedAt: number
}

let tokenCache: TokenCache | null = null
let folderCache: FolderCache | null = null
const FOLDER_CACHE_TTL_MS = 1000 * 60 * 30

function env(name: string) {
  return process.env[name]?.trim() || ''
}

export function getMailFromEmail() {
  return env('ZOHO_FROM_EMAIL') || DEFAULT_FROM
}

export function getMailConfigStatus(): MailConfigStatus {
  const missing = REQUIRED_ENV.filter((key) => !env(key))
  return {
    configured: missing.length === 0,
    missing: [...missing],
    fromEmail: getMailFromEmail(),
    accountsUrl: env('ZOHO_ACCOUNTS_URL') || 'https://accounts.zoho.com',
    mailApiUrl: env('ZOHO_MAIL_API_URL') || 'https://mail.zoho.com',
    accountIdSet: Boolean(env('ZOHO_ACCOUNT_ID')),
  }
}

export function isMailConfigured() {
  return getMailConfigStatus().configured
}

function requireConfig() {
  const status = getMailConfigStatus()
  if (!status.configured) {
    throw new MailError(
      `Zoho Mail is not configured. Missing: ${status.missing.join(', ')}`,
      503
    )
  }
  return status
}

async function refreshAccessToken(): Promise<string> {
  const status = requireConfig()
  const now = Date.now()
  if (tokenCache && tokenCache.expiresAt > now + 60_000) {
    return tokenCache.accessToken
  }

  const params = new URLSearchParams({
    refresh_token: env('ZOHO_REFRESH_TOKEN'),
    client_id: env('ZOHO_CLIENT_ID'),
    client_secret: env('ZOHO_CLIENT_SECRET'),
    grant_type: 'refresh_token',
  })

  const res = await fetch(`${status.accountsUrl}/oauth/v2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
    cache: 'no-store',
  })

  const data = (await res.json().catch(() => null)) as {
    access_token?: string
    expires_in?: number
    error?: string
    error_description?: string
  } | null

  if (!res.ok || !data?.access_token) {
    tokenCache = null
    const detail =
      data?.error_description || data?.error || `HTTP ${res.status}`
    throw new MailError(`Zoho auth failed: ${detail}`, 502)
  }

  const expiresInSec = Number(data.expires_in) || 3600
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: now + expiresInSec * 1000,
  }
  return data.access_token
}

async function zohoFetch<T>(
  path: string,
  init?: RequestInit & { retryAuth?: boolean }
): Promise<T> {
  const status = requireConfig()
  const token = await refreshAccessToken()
  const url = path.startsWith('http') ? path : `${status.mailApiUrl}${path}`

  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Zoho-oauthtoken ${token}`,
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  })

  const body = (await res.json().catch(() => null)) as {
    status?: { code?: number; description?: string }
    data?: unknown
    errorCode?: string
    moreInfo?: string
  } | null

  const apiCode = body?.status?.code
  const authFailed =
    res.status === 401 ||
    apiCode === 401 ||
    String(body?.errorCode || '').toUpperCase().includes('INVALID_OAUTHTOKEN')

  if (authFailed && init?.retryAuth !== false) {
    tokenCache = null
    return zohoFetch<T>(path, { ...init, retryAuth: false })
  }

  if (!res.ok || (apiCode !== undefined && apiCode >= 400)) {
    const dataObj =
      typeof body?.data === 'object' && body.data ? (body.data as Record<string, unknown>) : null
    const more =
      (dataObj && typeof dataObj.moreInfo === 'string' && dataObj.moreInfo) ||
      body?.moreInfo ||
      body?.status?.description ||
      `HTTP ${res.status}`
    throw new MailError(`Zoho Mail API error: ${more}`, 502)
  }

  return (body?.data ?? body) as T
}

type ZohoAccount = {
  accountId?: string | number
  mailboxAddress?: string
  primaryEmailAddress?: string
  emailAddress?: Array<{ mailId?: string; isPrimary?: boolean | number }>
}

type ZohoFolder = {
  folderId?: string | number
  folderName?: string
  folderType?: string
  path?: string
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

function pickAccountId(accounts: ZohoAccount[], fromEmail: string): string {
  const configured = env('ZOHO_ACCOUNT_ID')
  if (configured) return configured

  const target = normalizeEmail(fromEmail)
  const match = accounts.find((account) => {
    const mailbox = normalizeEmail(account.mailboxAddress || '')
    const primary = normalizeEmail(account.primaryEmailAddress || '')
    if (mailbox === target || primary === target) return true
    return (account.emailAddress || []).some(
      (entry) => normalizeEmail(entry.mailId || '') === target
    )
  })

  const chosen = match || accounts[0]
  const id = chosen?.accountId
  if (id === undefined || id === null || id === '') {
    throw new MailError(
      'No Zoho mail account found for this OAuth token. Set ZOHO_ACCOUNT_ID.',
      502
    )
  }
  return String(id)
}

function folderTypeOf(folder: ZohoFolder) {
  return String(folder.folderType || folder.folderName || '')
    .trim()
    .toLowerCase()
}

function resolveFolderIds(folders: ZohoFolder[]) {
  const inbox = folders.find((f) => {
    const t = folderTypeOf(f)
    return t === 'inbox' || f.path === '/Inbox'
  })
  const sent = folders.find((f) => {
    const t = folderTypeOf(f)
    return (
      t === 'sent' ||
      t === 'sent items' ||
      t === 'sentmail' ||
      f.path === '/Sent' ||
      f.path === '/Sent Items'
    )
  })

  if (!inbox?.folderId) {
    throw new MailError('Could not find Inbox folder in Zoho Mail.', 502)
  }
  if (!sent?.folderId) {
    throw new MailError('Could not find Sent folder in Zoho Mail.', 502)
  }

  return {
    inboxId: String(inbox.folderId),
    sentId: String(sent.folderId),
  }
}

async function getAccountContext() {
  const status = requireConfig()
  const now = Date.now()
  if (folderCache && folderCache.fetchedAt + FOLDER_CACHE_TTL_MS > now) {
    return folderCache
  }

  const accountsRaw = await zohoFetch<ZohoAccount[] | { accounts?: ZohoAccount[] }>(
    '/api/accounts'
  )
  const accounts = Array.isArray(accountsRaw)
    ? accountsRaw
    : accountsRaw?.accounts || []

  const accountId = pickAccountId(accounts, status.fromEmail)
  const folders = await zohoFetch<ZohoFolder[]>(
    `/api/accounts/${accountId}/folders`
  )
  const folderIds = resolveFolderIds(Array.isArray(folders) ? folders : [])

  folderCache = {
    accountId,
    ...folderIds,
    fetchedAt: now,
  }
  return folderCache
}

function folderIdFor(key: MailFolderKey, ctx: FolderCache) {
  return key === 'inbox' ? ctx.inboxId : ctx.sentId
}

function asString(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value)
}

/** Zoho sometimes returns addresses with HTML entities (&lt;email&gt;). */
function decodeBasicEntities(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
}

/** Normalize "Name <a@b.com>" / "&lt;a@b.com&gt;" → clean display string. */
function normalizeAddressField(value: string) {
  const decoded = decodeBasicEntities(value).trim()
  if (!decoded || decoded === 'Not Provided') return ''

  // Prefer bare email when the whole field is just <email> or "Name" <email>
  const emailMatch = decoded.match(
    /([a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+)/
  )
  if (emailMatch && /^<?[^<>]*@[^<>]+>?$/.test(decoded.replace(/^"|"$/g, '').trim())) {
    return emailMatch[1]
  }
  return decoded.replace(/^<|>$/g, '').trim()
}

function mapMessage(raw: Record<string, unknown>): MailMessageSummary {
  return {
    messageId: asString(raw.messageId),
    folderId: asString(raw.folderId),
    subject: decodeBasicEntities(asString(raw.subject)) || '(no subject)',
    summary: decodeBasicEntities(asString(raw.summary)),
    fromAddress: normalizeAddressField(asString(raw.fromAddress)),
    toAddress: normalizeAddressField(asString(raw.toAddress)),
    sender: normalizeAddressField(asString(raw.sender)),
    receivedTime: raw.receivedTime != null ? asString(raw.receivedTime) : null,
    sentDateInGMT:
      raw.sentDateInGMT != null ? asString(raw.sentDateInGMT) : null,
    hasAttachment:
      raw.hasAttachment === true ||
      raw.hasAttachment === 1 ||
      raw.hasAttachment === '1',
    status: asString(raw.status),
  }
}

export async function listMailMessages(options: {
  folder: MailFolderKey
  start?: number
  limit?: number
}) {
  const ctx = await getAccountContext()
  const folderId = folderIdFor(options.folder, ctx)
  const start = Math.max(1, options.start ?? 1)
  const limit = Math.min(200, Math.max(1, options.limit ?? 40))

  const params = new URLSearchParams({
    folderId,
    start: String(start),
    limit: String(limit),
    includeto: 'true',
    sortBy: 'date',
    sortorder: 'false',
  })

  const data = await zohoFetch<Record<string, unknown>[] | { messages?: unknown }>(
    `/api/accounts/${ctx.accountId}/messages/view?${params}`
  )

  const rows = Array.isArray(data)
    ? data
    : Array.isArray((data as { messages?: unknown }).messages)
      ? ((data as { messages: Record<string, unknown>[] }).messages)
      : []

  return {
    folder: options.folder,
    folderId,
    accountId: ctx.accountId,
    fromEmail: getMailFromEmail(),
    start,
    limit,
    messages: rows.map((row) => mapMessage(row)),
  }
}

export async function getMailMessageContent(folderId: string, messageId: string) {
  if (!/^\d+$/.test(folderId) || !/^\d+$/.test(messageId)) {
    throw new MailError('Invalid folder or message id.', 400)
  }

  const ctx = await getAccountContext()
  const contentData = await zohoFetch<{
    messageId?: string | number
    content?: string
  }>(
    `/api/accounts/${ctx.accountId}/folders/${folderId}/messages/${messageId}/content`
  )

  return {
    messageId: asString(contentData?.messageId || messageId),
    folderId,
    content: asString(contentData?.content),
  }
}

const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/

export function isValidEmail(value: string) {
  return EMAIL_RE.test(value.trim())
}

export async function sendMailMessage(input: {
  to: string
  subject: string
  content: string
  cc?: string
}) {
  const to = input.to.trim()
  const subject = input.subject.trim()
  const content = input.content.trim()
  const cc = input.cc?.trim() || ''

  if (!isValidEmail(to)) {
    throw new MailError('Recipient email address is invalid.', 400)
  }
  if (cc && !isValidEmail(cc)) {
    throw new MailError('CC email address is invalid.', 400)
  }
  if (!subject) throw new MailError('Subject is required.', 400)
  if (!content) throw new MailError('Message body is required.', 400)
  if (subject.length > 500) throw new MailError('Subject is too long.', 400)
  if (content.length > 100_000) throw new MailError('Message body is too long.', 400)

  const status = requireConfig()
  const ctx = await getAccountContext()
  const fromAddress = status.fromEmail

  // Use plaintext so Zoho doesn't HTML-escape address headers into &lt;email&gt;.
  const payload: Record<string, string> = {
    fromAddress,
    // Bare address only — never wrap in < > 
    toAddress: to,
    subject,
    content,
    mailFormat: 'plaintext',
    encoding: 'UTF-8',
  }
  if (cc) payload.ccAddress = cc

  await zohoFetch(`/api/accounts/${ctx.accountId}/messages`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  folderCache = null
  return { ok: true as const, fromAddress, to, subject }
}

export async function probeMail() {
  if (!isMailConfigured()) {
    return {
      ok: false as const,
      error: 'Zoho OAuth credentials are not configured.',
    }
  }
  try {
    const ctx = await getAccountContext()
    return {
      ok: true as const,
      fromEmail: getMailFromEmail(),
      accountId: ctx.accountId,
      inboxFolderId: ctx.inboxId,
      sentFolderId: ctx.sentId,
    }
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : 'Zoho probe failed',
    }
  }
}
