import { NextResponse } from 'next/server'
import {
  isAccessStage,
  isApplicationStatus,
  listApplications,
} from '@/lib/applications'
import { toPublicDbMessage } from '@/lib/db'
import { requireAdminSession } from '@/lib/requireAdmin'
import type { AccessStage, ApplicationStatus } from '@/lib/types'

export async function GET(request: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const statusRaw = searchParams.get('status') || 'all'
    const stageRaw = searchParams.get('stage') || 'all'
    const q = searchParams.get('q') || undefined

    const status =
      statusRaw === 'all'
        ? 'all'
        : isApplicationStatus(statusRaw)
          ? statusRaw
          : null
    if (status === null) {
      return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 })
    }

    let stage: AccessStage | 'all' = 'all'
    if (stageRaw !== 'all') {
      const n = Number(stageRaw)
      if (!isAccessStage(n)) {
        return NextResponse.json({ error: 'Invalid stage filter' }, { status: 400 })
      }
      stage = n
    }

    const applications = await listApplications({
      status: status as ApplicationStatus | 'all',
      stage,
      q,
    })
    return NextResponse.json({ applications })
  } catch (err) {
    console.error('list applications failed', err)
    return NextResponse.json({ error: toPublicDbMessage(err) }, { status: 503 })
  }
}
