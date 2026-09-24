import { NextResponse } from 'next/server'
import {
  getApplication,
  isAccessStage,
  isApplicationStatus,
  updateApplication,
} from '@/lib/applications'
import { toPublicDbMessage } from '@/lib/db'
import { runIdempotent } from '@/lib/idempotency'
import { getIdempotencyKey, requireAdminSession } from '@/lib/requireAdmin'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireAdminSession()
  if (!auth.ok) return auth.response

  try {
    const { id } = await params
    const application = await getApplication(id)
    if (!application) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ application })
  } catch (err) {
    console.error('get application failed', err)
    return NextResponse.json({ error: toPublicDbMessage(err) }, { status: 503 })
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireAdminSession()
  if (!auth.ok) return auth.response

  try {
    const { id } = await params
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }

    const status = 'status' in body ? body.status : undefined
    const accessStage = 'accessStage' in body ? body.accessStage : undefined
    const expectedUpdatedAt =
      typeof body.expectedUpdatedAt === 'string' ? body.expectedUpdatedAt : null

    if (!expectedUpdatedAt) {
      return NextResponse.json(
        { error: 'expectedUpdatedAt is required for concurrent-safe updates' },
        { status: 400 }
      )
    }
    if (status !== undefined && !isApplicationStatus(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    if (accessStage !== undefined && !isAccessStage(accessStage)) {
      return NextResponse.json({ error: 'Invalid access stage' }, { status: 400 })
    }

    const requestBody = { status, accessStage, expectedUpdatedAt }

    const execute = async () => {
      const result = await updateApplication({
        id,
        status,
        accessStage,
        expectedUpdatedAt,
      })
      if (!result.ok) {
        const statusCode =
          result.code === 'not_found' ? 404 : result.code === 'conflict' ? 409 : 400
        return { status: statusCode, body: { error: result.error } }
      }
      return { status: 200, body: { application: result.application } }
    }

    const idempotencyKey = getIdempotencyKey(request)
    if (!idempotencyKey) {
      const result = await execute()
      return NextResponse.json(result.body, { status: result.status })
    }

    const cached = await runIdempotent({
      adminId: auth.session.adminId,
      route: `PATCH /api/applications/${id}`,
      idempotencyKey,
      requestBody,
      run: execute,
    })

    return NextResponse.json(cached.body, {
      status: cached.status,
      headers: cached.replayed ? { 'X-Idempotent-Replay': 'true' } : undefined,
    })
  } catch (err) {
    console.error('patch application failed', err)
    return NextResponse.json({ error: toPublicDbMessage(err) }, { status: 503 })
  }
}
