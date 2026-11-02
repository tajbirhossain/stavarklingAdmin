import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/requireAdmin'
import { getMailMessageContent, MailError } from '@/lib/zohoMail'

export async function GET(request: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const folderId = searchParams.get('folderId') || ''
    const messageId = searchParams.get('messageId') || ''

    if (!folderId || !messageId) {
      return NextResponse.json(
        { error: 'folderId and messageId are required' },
        { status: 400 }
      )
    }

    const result = await getMailMessageContent(folderId, messageId)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof MailError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('message content failed', err)
    return NextResponse.json(
      { error: 'Unexpected error talking to Zoho Mail.' },
      { status: 500 }
    )
  }
}
