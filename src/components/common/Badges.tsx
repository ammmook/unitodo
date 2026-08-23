import type { Work, WorkStatus } from '../../types/todolist'
import { WORK_PRIORITY_STYLE, WORK_STATUS_STYLE, computeWorkPriority } from '../../utils/workFormatting'

const BADGE_BASE =
  'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold'

export function StatusBadge({ status, compact = false }: { status: WorkStatus; compact?: boolean }) {
  const style = WORK_STATUS_STYLE[status]
  return (
    <span className={`${BADGE_BASE} ${style.badgeClass}`}>
      <span aria-hidden="true">{style.icon}</span>
      {compact ? style.shortLabel : style.label}
    </span>
  )
}

/** งานที่เสร็จแล้วไม่มี priority — badge จะหายไปเองไม่ต้องเช็คจากฝั่งผู้เรียก */
export function PriorityBadge({ work }: { work: Work }) {
  const priority = computeWorkPriority(work.dueDate, work.status)
  if (!priority) return null

  const style = WORK_PRIORITY_STYLE[priority]
  return (
    <span className={`${BADGE_BASE} ${style.badgeClass}`}>
      <span aria-hidden="true">{style.icon}</span>
      {style.label}
    </span>
  )
}

export function OverdueBadge({ overdueDays }: { overdueDays: number }) {
  return (
    <span className={`${BADGE_BASE} bg-overdue text-white`}>เลยกำหนด {overdueDays} วัน</span>
  )
}
