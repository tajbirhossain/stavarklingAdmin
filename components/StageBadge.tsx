import type { AccessStage } from '@/lib/types'
import { STAGE_LABELS } from '@/lib/constants'

export default function StageBadge({ stage }: { stage: AccessStage }) {
  const meta = STAGE_LABELS[stage]
  return (
    <span className="stage-badge">
      <span className="stage-badge-num">{meta.number}</span>
      <span className="stage-badge-title">{meta.title}</span>
    </span>
  )
}
