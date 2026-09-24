import { NextResponse } from 'next/server'
import { toPublicDbMessage } from '@/lib/db'
import { runIdempotent } from '@/lib/idempotency'
import { getIdempotencyKey, requireAdminSession } from '@/lib/requireAdmin'
import { advanceFromStageRequest } from '@/lib/stageRequests'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
  const auth = await requireAdminSession()
  if (!auth.ok) return auth.response

  try {
    const { id } = await params

    const execute = async () => {
      const result = await advanceFromStageRequest(id)
      if (!result.ok) {
        const statusCode =
          result.code === 'not_found' ? 404 : result.code === 'conflict' ? 409 : 400
        return { status: statusCode, body: { error: result.error } }
      }
      return { status: 200, body: result }
    }

    const idempotencyKey = getIdempotencyKey(request)
    if (!idempotencyKey) {
      const result = await execute()
      return NextResponse.json(result.body, { status: result.status })
    }

    const cached = await runIdempotent({
      adminId: auth.session.adminId,
      route: `POST /api/stage-requests/${id}/advance`,
      idempotencyKey,
      requestBody: { id },
      run: execute,
    })

    return NextResponse.json(cached.body, {
      status: cached.status,
      headers: cached.replayed ? { 'X-Idempotent-Replay': 'true' } : undefined,
    })
  } catch (err) {
    console.error('advance stage request failed', err)
    return NextResponse.json({ error: toPublicDbMessage(err) }, { status: 503 })
  }
}
