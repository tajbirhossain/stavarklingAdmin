import { withClient, withTransaction } from '@/lib/db'
import type { AccessStage, ApplicationStatus, StageRequest } from '@/lib/types'

type StageRequestRow = {
  id: string
  application_id: string
  full_name: string
  email: string
  from_stage: number
  current_stage: number
  status: ApplicationStatus
  requested_at: Date
}

function mapRow(row: StageRequestRow): StageRequest {
  return {
    id: row.id,
    applicationId: row.application_id,
    fullName: row.full_name,
    email: row.email,
    fromStage: row.from_stage as AccessStage,
    currentStage: row.current_stage as AccessStage,
    status: row.status,
    requestedAt: row.requested_at.toISOString(),
  }
}

export async function listStageRequests(): Promise<StageRequest[]> {
  return withClient(async (client) => {
    const result = await client.query<StageRequestRow>(
      `SELECT
         r.id,
         r.application_id,
         a.full_name,
         a.email,
         r.from_stage,
         a.access_stage AS current_stage,
         a.status,
         r.requested_at
       FROM access_stage_requests r
       JOIN access_applications a ON a.id = r.application_id
       WHERE r.from_stage = a.access_stage
       ORDER BY r.requested_at DESC
       LIMIT 200`
    )
    return result.rows.map(mapRow)
  })
}

export type AdvanceResult =
  | {
      ok: true
      applicationId: string
      fromStage: AccessStage
      toStage: AccessStage
      alreadyAdvanced: boolean
    }
  | { ok: false; error: string; code: 'not_found' | 'conflict' | 'invalid' }

export async function advanceFromStageRequest(
  requestId: string
): Promise<AdvanceResult> {
  return withTransaction(async (client) => {
    const existing = await client.query<{
      id: string
      application_id: string
      from_stage: number
      access_stage: number
    }>(
      `SELECT r.id, r.application_id, r.from_stage, a.access_stage
       FROM access_stage_requests r
       JOIN access_applications a ON a.id = r.application_id
       WHERE r.id = $1
       LIMIT 1
       FOR UPDATE OF a`,
      [requestId]
    )

    const row = existing.rows[0]
    if (!row) {
      return { ok: false as const, error: 'Not found', code: 'not_found' as const }
    }

    // Idempotent: already moved past this request's stage.
    if (row.access_stage > row.from_stage) {
      return {
        ok: true as const,
        applicationId: row.application_id,
        fromStage: row.from_stage as AccessStage,
        toStage: row.access_stage as AccessStage,
        alreadyAdvanced: true,
      }
    }

    if (row.from_stage !== row.access_stage) {
      return {
        ok: false as const,
        error: 'Request already resolved',
        code: 'conflict' as const,
      }
    }

    if (row.access_stage >= 3) {
      return {
        ok: false as const,
        error: 'Applicant is already at the final stage',
        code: 'invalid' as const,
      }
    }

    const nextStage = (row.access_stage + 1) as AccessStage
    const updated = await client.query<{ id: string }>(
      `UPDATE access_applications
       SET access_stage = $1
       WHERE id = $2
         AND access_stage = $3
       RETURNING id`,
      [nextStage, row.application_id, row.access_stage]
    )

    if (!updated.rows[0]) {
      return {
        ok: false as const,
        error: 'Stage changed concurrently. Refresh and try again.',
        code: 'conflict' as const,
      }
    }

    return {
      ok: true as const,
      applicationId: row.application_id,
      fromStage: row.from_stage as AccessStage,
      toStage: nextStage,
      alreadyAdvanced: false,
    }
  })
}
