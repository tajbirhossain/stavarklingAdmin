import type { AccessStage, ApplicationStatus } from '@/lib/types'

export const STAGE_LABELS: Record<AccessStage, { number: string; title: string }> = {
  1: { number: '01', title: 'The Beginning' },
  2: { number: '02', title: 'The Moment' },
  3: { number: '03', title: 'The Decision' },
}

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending: 'Pending',
  under_review: 'Under review',
  approved: 'Approved',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
}

export const STATUS_OPTIONS: ApplicationStatus[] = [
  'pending',
  'under_review',
  'approved',
  'rejected',
  'withdrawn',
]

export const NAV_ITEMS = [
  { href: '/', label: 'Overview', icon: 'overview' as const },
  { href: '/applications', label: 'Applicants', icon: 'users' as const },
  { href: '/stage-requests', label: 'Stage requests', icon: 'stages' as const },
  { href: '/settings', label: 'Settings', icon: 'settings' as const },
]

export const COOKIE_NAME = 'stavarkling_admin_session'
