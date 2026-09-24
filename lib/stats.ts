import { withClient } from '@/lib/db'
import type { AccessStage, Application, ApplicationStatus, DashboardStats } from '@/lib/types'

type RecentRow = {
  id: string
  full_name: string
  email: string
  country: string
  reason: string
  reflection: string | null
  status: ApplicationStatus
  access_stage: number
  access_stage_updated_at: Date
  client_ip: string | null
  user_agent: string | null
  created_at: Date
  updated_at: Date
  pending_stage_request: boolean
}

export async function getDashboardStats(): Promise<DashboardStats> {
  return withClient(async (client) => {
    const counts = await client.query<{ status: ApplicationStatus; count: string }>(
      `SELECT status, COUNT(*)::text AS count
       FROM access_applications
       GROUP BY status`
    )

    const byStatus = Object.fromEntries(
      counts.rows.map((r) => [r.status, Number(r.count)])
    ) as Partial<Record<ApplicationStatus, number>>

    const stages = await client.query<{ stage: number; count: string }>(
      `SELECT access_stage AS stage, COUNT(*)::text AS count
       FROM access_applications
       WHERE status = 'approved'
       GROUP BY access_stage
       ORDER BY access_stage`
    )

    const openRequests = await client.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM access_stage_requests r
       JOIN access_applications a ON a.id = r.application_id
       WHERE r.from_stage = a.access_stage`
    )

    const recent = await client.query<RecentRow>(
      `SELECT
         a.id,
         a.full_name,
         a.email,
         a.country,
         a.reason,
         a.reflection,
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
       ORDER BY a.created_at DESC
       LIMIT 6`
    )

    const recentApplications: Application[] = recent.rows.map((row) => ({
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      country: row.country,
      reason: row.reason,
      reflection: row.reflection,
      status: row.status,
      accessStage: row.access_stage as AccessStage,
      accessStageUpdatedAt: row.access_stage_updated_at.toISOString(),
      clientIp: row.client_ip,
      userAgent: row.user_agent,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      pendingStageRequest: row.pending_stage_request,
    }))

    return {
      totalApplications: Object.values(byStatus).reduce((a, b) => a + (b ?? 0), 0),
      pendingReview: (byStatus.pending ?? 0) + (byStatus.under_review ?? 0),
      approved: byStatus.approved ?? 0,
      rejected: byStatus.rejected ?? 0,
      stageRequestsOpen: Number(openRequests.rows[0]?.count ?? 0),
      byStage: [1, 2, 3].map((stage) => ({
        stage: stage as AccessStage,
        count: Number(stages.rows.find((r) => r.stage === stage)?.count ?? 0),
      })),
      recentApplications,
    }
  })
}
