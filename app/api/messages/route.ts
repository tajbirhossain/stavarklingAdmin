import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/requireAdmin'
import {
  isValidEmail,
  listMailMessages,
  MailError,
  sendMailMessage,
  type MailFolderKey,
} from '@/lib/zohoMail'

function toErrorResponse(err: unknown) {
  if (err instanceof MailError) {
    return NextResponse.json({ error: err.message }, { status: err.status })
  }
  console.error('messages route failed', err)
  return NextResponse.json(
    { error: 'Unexpected error talking to Zoho Mail.' },
    { status: 500 }
  )
}

function parseFolder(raw: string | null): MailFolderKey | null {
  if (raw === 'inbox' || raw === 'sent') return raw
  return null
}

export async function GET(request: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const folder = parseFolder(searchParams.get('folder') || 'inbox')
    if (!folder) {
      return NextResponse.json(
        { error: 'folder must be inbox or sent' },
        { status: 400 }
      )
    }

    const start = Number(searchParams.get('start') || '1')
    const limit = Number(searchParams.get('limit') || '40')
    if (!Number.isFinite(start) || !Number.isFinite(limit)) {
      return NextResponse.json({ error: 'Invalid pagination' }, { status: 400 })
    }

    const result = await listMailMessages({ folder, start, limit })
    return NextResponse.json(result)
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) return auth.response

  try {
    const body = (await request.json().catch(() => null)) as {
      to?: string
      subject?: string
      content?: string
      cc?: string
    } | null

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const to = String(body.to || '')
    const subject = String(body.subject || '')
    const content = String(body.content || '')
    const cc = body.cc != null ? String(body.cc) : undefined

    if (!isValidEmail(to)) {
      return NextResponse.json(
        { error: 'Recipient email address is invalid.' },
        { status: 400 }
      )
    }

    const result = await sendMailMessage({ to, subject, content, cc })
    return NextResponse.json(result)
  } catch (err) {
    return toErrorResponse(err)
  }
}
