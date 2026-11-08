import { withClient } from '@/lib/db'

export const ACQUISITION_STATUSES = [
  'received',
  'in_conversation',
  'handover_open',
  'handover_submitted',
  'completed',
  'closed',
] as const

export type AcquisitionStatus = (typeof ACQUISITION_STATUSES)[number]

export const ACQUISITION_STATUS_LABELS: Record<AcquisitionStatus, string> = {
  received: 'Received',
  in_conversation: 'In conversation',
  handover_open: 'Handover open',
  handover_submitted: 'Handover submitted',
  completed: 'Completed',
  closed: 'Closed',
}

export function isAcquisitionStatus(value: unknown): value is AcquisitionStatus {
  return (
    typeof value === 'string' &&
    (ACQUISITION_STATUSES as readonly string[]).includes(value)
  )
}

export type Acquisition = {
  id: string
  applicationId: string
  fullName: string
  email: string
  country: string | null
  placeAnswer: string
  drawAnswer: string | null
  contactMethod: string
  contactDetail: string | null
  bestTime: string | null
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
  place_answer: string
  draw_answer: string | null
  contact_method: string
  contact_detail: string | null
  best_time: string | null
  status: AcquisitionStatus
  replied_at: Date | null
  created_at: Date
}

const REPLY_WINDOW_MS = 24 * 60 * 60 * 1000

export async function listAcquisitions(): Promise<Acquisition[]> {
  return withClient(async (client) => {
    const result = await client.query<Row>(
      `SELECT e.id, e.application_id, a.full_name, a.email, a.country,
              e.place_answer, e.draw_answer, e.contact_method,
              e.contact_detail, e.best_time, e.status, e.replied_at,
              e.created_at
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
      placeAnswer: r.place_answer,
      drawAnswer: r.draw_answer,
      contactMethod: r.contact_method,
      contactDetail: r.contact_detail,
      bestTime: r.best_time,
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
