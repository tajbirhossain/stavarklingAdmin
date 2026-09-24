import type { ApplicationStatus } from '@/lib/types'
import { STATUS_LABELS } from '@/lib/constants'

const TONES: Record<ApplicationStatus, string> = {
  pending: 'status-pending',
  under_review: 'status-review',
  approved: 'status-approved',
  rejected: 'status-rejected',
  withdrawn: 'status-withdrawn',
}

export default function StatusBadge({ status }: { status: ApplicationStatus }) {
  return <span className={`status-badge ${TONES[status]}`}>{STATUS_LABELS[status]}</span>
}
