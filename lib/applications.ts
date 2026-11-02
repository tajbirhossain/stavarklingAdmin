import { withClient, withTransaction } from '@/lib/db'
import type { AccessStage, Application, ApplicationStatus } from '@/lib/types'

type ApplicationRow = {
  id: string
  full_name: string
  email: string
  country: string
  reason: string | null
  status: ApplicationStatus
  access_stage: number
  access_stage_updated_at: Date
  client_ip: string | null
  user_agent: string | null
  created_at: Date
  updated_at: Date
  pending_stage_request: boolean
}

function mapRow(row: ApplicationRow): Application {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    country: row.country,
    reason: row.reason,
    status: row.status,
    accessStage: row.access_stage as AccessStage,
    accessStageUpdatedAt: row.access_stage_updated_at.toISOString(),
    clientIp: row.client_ip,
    userAgent: row.user_agent,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    pendingStageRequest: row.pending_stage_request,
  }
}

const SELECT_BASE = `
  SELECT
    a.id,
    a.full_name,
    a.email,
    a.country,
    a.reason,
    a.status,
    a.access_stage,
    a.access_stage_updated_at,
    a.client_ip::text AS client_ip,
    a.user_agent,
    a.created_at,
    a.updated_at,
    EXISTS (
      SELECT 1
      FROM access_stage_requests r
      WHERE r.application_id = a.id
        AND r.from_stage = a.access_stage
    ) AS pending_stage_request
  FROM access_applications a
`

const STATUS_SET = new Set<ApplicationStatus>([
  'pending',
  'under_review',
  'approved',
  'rejected',
  'withdrawn',
])

export function isApplicationStatus(value: unknown): value is ApplicationStatus {
  return typeof value === 'string' && STATUS_SET.has(value as ApplicationStatus)
}

export function isAccessStage(value: unknown): value is AccessStage {
  return value === 1 || value === 2 || value === 3
}

export async function listApplications(filters?: {
  status?: ApplicationStatus | 'all'
  stage?: AccessStage | 'all'
  q?: string
}): Promise<Application[]> {
  return withClient(async (client) => {
    const where: string[] = []
    const params: unknown[] = []

    if (filters?.status && filters.status !== 'all') {
      params.push(filters.status)
      where.push(`a.status = $${params.length}`)
    }
    if (filters?.stage && filters.stage !== 'all') {
      params.push(filters.stage)
      where.push(`a.access_stage = $${params.length}`)
    }
    if (filters?.q?.trim()) {
      params.push(`%${filters.q.trim().toLowerCase()}%`)
      where.push(
        `(lower(a.full_name) LIKE $${params.length} OR lower(a.email) LIKE $${params.length} OR lower(a.country) LIKE $${params.length})`
      )
    }

    const sql = `${SELECT_BASE}
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY a.created_at DESC
      LIMIT 200`

    const result = await client.query<ApplicationRow>(sql, params)
    return result.rows.map(mapRow)
  })
}

export async function getApplication(id: string): Promise<Application | null> {
  return withClient(async (client) => {
    const result = await client.query<ApplicationRow>(
      `${SELECT_BASE} WHERE a.id = $1 LIMIT 1`,
      [id]
    )
    return result.rows[0] ? mapRow(result.rows[0]) : null
  })
}

export type UpdateApplicationResult =
  | { ok: true; application: Application }
  | { ok: false; error: string; code: 'not_found' | 'conflict' | 'invalid' }

export async function updateApplication(input: {
  id: string
  status?: ApplicationStatus
  accessStage?: AccessStage
  expectedUpdatedAt: string
}): Promise<UpdateApplicationResult> {
  if (!input.status && !input.accessStage) {
    return { ok: false, error: 'No changes provided', code: 'invalid' }
  }
  if (input.status && !isApplicationStatus(input.status)) {
    return { ok: false, error: 'Invalid status', code: 'invalid' }
  }
  if (input.accessStage && !isAccessStage(input.accessStage)) {
    return { ok: false, error: 'Invalid access stage', code: 'invalid' }
  }

  const expected = new Date(input.expectedUpdatedAt)
  if (Number.isNaN(expected.getTime())) {
    return { ok: false, error: 'Invalid expectedUpdatedAt', code: 'invalid' }
  }
  const expectedMs = expected.getTime()

  return withTransaction(async (client) => {
    const locked = await client.query<{
      id: string
      updated_at: Date
      status: ApplicationStatus
      access_stage: number
    }>(
      `SELECT id, updated_at, status, access_stage
       FROM access_applications
       WHERE id = $1
       LIMIT 1
       FOR UPDATE`,
      [input.id]
    )

    const row = locked.rows[0]
    if (!row) {
      return { ok: false as const, error: 'Not found', code: 'not_found' as const }
    }

    // Compare at millisecond precision — JS Date / ISO cannot carry Postgres micros.
    if (Math.abs(row.updated_at.getTime() - expectedMs) > 1) {
      return {
        ok: false as const,
        error:
          'This applicant was updated elsewhere. Refresh and try again.',
        code: 'conflict' as const,
      }
    }

    const nextStatus = input.status ?? row.status
    const nextStage = input.accessStage ?? (row.access_stage as AccessStage)

    const updated = await client.query<{ id: string }>(
      `UPDATE access_applications
       SET status = $1::access_application_status,
           access_stage = $2
       WHERE id = $3
         AND trunc(extract(epoch from updated_at) * 1000) = $4
       RETURNING id`,
      [nextStatus, nextStage, input.id, expectedMs]
    )

    if (!updated.rows[0]) {
      return {
        ok: false as const,
        error:
          'This applicant was updated elsewhere. Refresh and try again.',
        code: 'conflict' as const,
      }
    }

    const refreshed = await client.query<ApplicationRow>(
      `${SELECT_BASE} WHERE a.id = $1 LIMIT 1`,
      [input.id]
    )

    if (!refreshed.rows[0]) {
      return { ok: false as const, error: 'Not found', code: 'not_found' as const }
    }

    return { ok: true as const, application: mapRow(refreshed.rows[0]) }
  })
}
