import type { Subject, Work } from '../../types/todolist'
import {
  WORK_STATUS_STYLE,
  WORK_TYPE_STYLE,
  daysUntilDue,
  describeDueDistance,
  formatDueDate,
  isOverdue,
} from '../../utils/workFormatting'
import { OverdueBadge, StatusBadge } from '../common/Badges'
import { EmptyState } from '../common/EmptyState'

interface DeadlineTimelineProps {
  works: Work[]
  subjectsById: Map<string, Subject>
  onSelectWork: (workId: string) => void
  onSeeAll: () => void
  onAddWork: () => void
}

/** ไทม์ไลน์กำหนดส่ง 3 สัปดาห์ข้างหน้า */
export function DeadlineTimeline({
  works,
  subjectsById,
  onSelectWork,
  onSeeAll,
  onAddWork,
}: DeadlineTimelineProps) {
  return (
    <section
      aria-labelledby="deadline-timeline-heading"
      className="lg:rounded-[22px] lg:border lg:border-ink/10 lg:bg-white lg:px-6 lg:py-5.5"
    >
      <div className="mb-3 flex items-baseline justify-between gap-2.5 lg:mb-4.5">
        <h2 id="deadline-timeline-heading" className="text-sm font-bold lg:text-[15px]">
          ใกล้ถึงกำหนด
        </h2>
        <button
          type="button"
          onClick={onSeeAll}
          className="text-[12.5px] font-bold text-[#1b5aa8] hover:underline"
        >
          ดูทั้งหมด →
        </button>
      </div>

      {works.length === 0 ? (
        <EmptyState
          icon="✨"
          title="Nothing here yet!"
          description="ยังไม่มีงานค้างในเทอมนี้ ลองเพิ่มงานใหม่กันเลย"
          actionLabel="+ Add Work"
          onAction={onAddWork}
        />
      ) : (
        <ol className="flex flex-col gap-2.5 border-l-2 border-dashed border-ink/15 pl-5 lg:gap-3.5 lg:pl-5.5">
          {works.map((work) => {
            const overdue = isOverdue(work.dueDate, work.status)
            const subject = subjectsById.get(work.subjectId)
            return (
              <li key={work.id} className="relative">
                <span
                  aria-hidden="true"
                  className="absolute top-3.5 -left-[27px] h-3.5 w-3.5 rounded-full border-[3px] border-cream lg:border-white"
                  style={{
                    background: overdue
                      ? 'var(--color-overdue)'
                      : WORK_STATUS_STYLE[work.status].accentColor,
                    boxShadow: `0 0 0 2px ${
                      overdue ? 'var(--color-overdue)' : WORK_STATUS_STYLE[work.status].accentColor
                    }`,
                  }}
                />
                <button
                  type="button"
                  onClick={() => onSelectWork(work.id)}
                  className={`w-full rounded-[15px] border p-3.5 text-left transition-transform lg:flex lg:flex-wrap lg:items-center lg:gap-2.5 lg:rounded-2xl lg:px-4 lg:hover:translate-x-1 ${
                    overdue
                      ? 'border-overdue/30 bg-overdue-soft'
                      : 'border-ink/10 bg-white lg:bg-cream'
                  }`}
                >
                  <h3 className="text-[13.5px] font-bold break-words lg:min-w-[150px] lg:flex-1 lg:text-sm">
                    {work.title}
                  </h3>
                  <p className="mt-1 text-[11.5px] text-ink/75 lg:mt-0 lg:text-xs">
                    {subject?.name} · {WORK_TYPE_STYLE[work.type].label} ·{' '}
                    {formatDueDate(work.dueDate, false)}
                    {daysUntilDue(work.dueDate) >= 0 && ` · ${describeDueDistance(work.dueDate)}`}
                  </p>
                  <span className="mt-2 flex flex-wrap gap-1.5 lg:mt-0 lg:contents">
                    {overdue && <OverdueBadge overdueDays={Math.abs(daysUntilDue(work.dueDate))} />}
                    <StatusBadge status={work.status} />
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
