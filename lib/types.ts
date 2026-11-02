export type ApplicationStatus =
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'withdrawn'

export type AccessStage = 1 | 2 | 3

export type Application = {
  id: string
  fullName: string
  email: string
  country: string
  reason: string | null
  status: ApplicationStatus
  accessStage: AccessStage
  accessStageUpdatedAt: string
  clientIp: string | null
  userAgent: string | null
  createdAt: string
  updatedAt: string
  pendingStageRequest: boolean
}

export type StageRequest = {
  id: string
  applicationId: string
  fullName: string
  email: string
  fromStage: AccessStage
  currentStage: AccessStage
  status: ApplicationStatus
  requestedAt: string
}

export type DashboardStats = {
  totalApplications: number
  pendingReview: number
  approved: number
  rejected: number
  stageRequestsOpen: number
  byStage: { stage: AccessStage; count: number }[]
  recentApplications: Application[]
}
