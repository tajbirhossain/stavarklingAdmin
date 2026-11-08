import { withClient } from '@/lib/db'

import type { AcquisitionStatus } from '@/lib/acquisitionStatus'

export {
  ACQUISITION_STATUSES,
  ACQUISITION_STATUS_LABELS,
  isAcquisitionStatus,
  type AcquisitionStatus,
} from '@/lib/acquisitionStatus'

export type Acquisition = {
  id: string
  applicationId: string
  fullName: string
  email: string
  country: string | null
  message: string | null
  status: AcquisitionStatus
  repliedAt: string | null
  createdAt: string
  /** True when still unanswered more than 24 hours after the enquiry. */
  overdue: boolean
}

type Row = {
  id: string
  application_id: string
  full_name: string
  email: string
  country: string | null
  message: string | null
  status: AcquisitionStatus
  replied_at: Date | null
  created_at: Date
}

const REPLY_WINDOW_MS = 24 * 60 * 60 * 1000

export async function listAcquisitions(): Promise<Acquisition[]> {
  return withClient(async (client) => {
    const result = await client.query<Row>(
      `SELECT e.id, e.application_id, a.full_name, a.email, a.country,
              e.message, e.status, e.replied_at, e.created_at
       FROM acquisition_enquiries e
       JOIN access_applications a ON a.id = e.application_id
       ORDER BY e.created_at DESC
       LIMIT 200`
    )
    const now = Date.now()
    return result.rows.map((r) => ({
      id: r.id,
      applicationId: r.application_id,
      fullName: r.full_name,
      email: r.email,
      country: r.country,
      message: r.message,
      status: r.status,
      repliedAt: r.replied_at?.toISOString() ?? null,
      createdAt: r.created_at.toISOString(),
      overdue:
        r.status === 'received' &&
        !r.replied_at &&
        now - r.created_at.getTime() > REPLY_WINDOW_MS,
    }))
  })
}

export async function updateAcquisitionStatus(
  id: string,
  status: AcquisitionStatus
): Promise<boolean> {
  return withClient(async (client) => {
    // First move out of "received" counts as the artist having replied.
    const result = await client.query(
      `UPDATE acquisition_enquiries
       SET status = $2,
           replied_at = CASE
             WHEN $2 <> 'received' AND replied_at IS NULL THEN now()
             ELSE replied_at
           END
       WHERE id = $1`,
      [id, status]
    )
    return (result.rowCount ?? 0) > 0
  })
}
