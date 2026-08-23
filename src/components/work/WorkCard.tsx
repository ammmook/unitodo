import { memo } from 'react'
import type { Subject, Work } from '../../types/todolist'
import {
  WORK_STATUS_STYLE,
  WORK_TYPE_STYLE,
  daysUntilDue,
  describeDueDistance,
  formatDueDate,
  isOverdue,
} from '../../utils/workFormatting'
import { OverdueBadge, PriorityBadge, StatusBadge } from '../common/Badges'

interface WorkCardProps {
  work: Work
  subject: Subject | undefined
  isSelected: boolean
  onSelect: (workId: string) => void
  onToggleCompleted: (work: Work) => void
}

export const WorkCard = memo(function WorkCard({
  work,
  subject,
  isSelected,
  onSelect,
  onToggleCompleted,
}: WorkCardProps) {
  const overdue = isOverdue(work.dueDate, work.status)
  const isCompleted = work.status === 'completed'

  return (
    <article
      className={`flex items-start gap-3 rounded-2xl border border-l-5 p-3.5 transition-[transform,box-shadow] lg:items-center lg:gap-3.5 lg:rounded-[18px] lg:p-4 lg:hover:-translate-y-0.5 lg:hover:shadow-[0_14px_26px_-20px_rgba(42,38,34,.6)] ${
        WORK_STATUS_STYLE[work.status].accentClass
      } ${
        overdue
          ? 'border-overdue/30 border-l-overdue bg-white'
          : isCompleted
            ? 'border-ink/8 bg-cream-soft'
            : 'border-ink/10 bg-white'
      } ${isSelected ? 'ring-2 ring-ink/25' : ''}`}
    >
      <button
        type="button"
        aria-label={
          isCompleted
            ? `ทำเครื่องหมายว่ายังไม่เสร็จ: ${work.title}`
            : `ทำเครื่องหมายว่าเสร็จ: ${work.title}`
        }
        aria-pressed={isCompleted}
        onClick={() => onToggleCompleted(work)}
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-[13px] text-lg font-bold transition-colors lg:h-7 lg:w-7 lg:rounded-[9px] lg:text-sm ${
          isCompleted
            ? 'bg-done text-white'
            : 'border-2 border-ink/25 bg-white hover:border-done lg:border-ink/30'
        }`}
      >
        {isCompleted ? '✓' : ''}
      </button>

      <button
        type="button"
        onClick={() => onSelect(work.id)}
        className="min-w-0 flex-1 text-left lg:contents"
      >
        <span className="block min-w-0 lg:flex-1">
          <span
            className={`block text-[14.5px] font-bold break-words lg:text-[15px] ${
              isCompleted ? 'text-ink/70 line-through decoration-ink/35' : ''
            }`}
          >
            {work.title}
          </span>
          <span className="mt-1 block text-[11.5px] text-ink/75 lg:text-xs">
            {subject?.name} · {WORK_TYPE_STYLE[work.type].label}
            {isCompleted
              ? ' · เสร็จแล้ว'
              : ` · ส่ง ${formatDueDate(work.dueDate, false)}${
                  overdue ? '' : ` · ${describeDueDistance(work.dueDate)}`
                }`}
          </span>
        </span>
        <span className="mt-2 flex flex-wrap gap-1.5 lg:mt-0 lg:contents">
          {!isCompleted && <PriorityBadge priority={work.priority} />}
          {overdue && <OverdueBadge overdueDays={Math.abs(daysUntilDue(work.dueDate))} />}
          <StatusBadge status={work.status} />
        </span>
      </button>
    </article>
  )
})
