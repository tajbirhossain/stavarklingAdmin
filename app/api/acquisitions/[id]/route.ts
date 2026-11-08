import { NextResponse } from 'next/server'
import { isAcquisitionStatus, updateAcquisitionStatus } from '@/lib/acquisitions'
import { toPublicDbMessage } from '@/lib/db'
import { requireAdminSession } from '@/lib/requireAdmin'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireAdminSession()
  if (!auth.ok) return auth.response

  try {
    const { id } = await params
    const body = await request.json().catch(() => null)
    if (!body || !isAcquisitionStatus(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const ok = await updateAcquisitionStatus(id, body.status)
    if (!ok) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('update acquisition failed', err)
    return NextResponse.json({ error: toPublicDbMessage(err) }, { status: 503 })
  }
}
