import { NextResponse } from 'next/server'
import { toPublicDbMessage } from '@/lib/db'
import { requireAdminSession } from '@/lib/requireAdmin'
import { listStageRequests } from '@/lib/stageRequests'

export async function GET() {
  const auth = await requireAdminSession()
  if (!auth.ok) return auth.response

  try {
    const requests = await listStageRequests()
    return NextResponse.json({ requests })
  } catch (err) {
    console.error('list stage requests failed', err)
    return NextResponse.json({ error: toPublicDbMessage(err) }, { status: 503 })
  }
}
