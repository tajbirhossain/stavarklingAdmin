// Client-safe: no database imports, so browser components can use it.

export const ACQUISITION_STATUSES = [
  'received',
  'in_conversation',
  'completed',
  'closed',
] as const

export type AcquisitionStatus = (typeof ACQUISITION_STATUSES)[number]

export const ACQUISITION_STATUS_LABELS: Record<AcquisitionStatus, string> = {
  received: 'Received',
  in_conversation: 'In conversation',
  completed: 'Completed',
  closed: 'Closed',
}

export function isAcquisitionStatus(value: unknown): value is AcquisitionStatus {
  return (
    typeof value === 'string' &&
    (ACQUISITION_STATUSES as readonly string[]).includes(value)
  )
}
