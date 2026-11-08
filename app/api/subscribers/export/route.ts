import { NextResponse } from 'next/server'
import { toPublicDbMessage } from '@/lib/db'
import { requireAdminSession } from '@/lib/requireAdmin'
import { subscribersCsv } from '@/lib/subscribers'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAdminSession()
  if (!auth.ok) return auth.response

  try {
    const csv = await subscribersCsv()
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="subscribers.csv"',
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('export subscribers failed', err)
    return NextResponse.json({ error: toPublicDbMessage(err) }, { status: 503 })
  }
}
