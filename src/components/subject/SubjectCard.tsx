import type { SubjectProgress } from '../../hooks/useTodolistData'

interface SubjectCardProps {
  progress: SubjectProgress
  onAddFirstWork: (subjectId: string) => void
  onOpenSubjectWorks: (subjectId: string) => void
}

/** การ์ดวิชา + แถบความคืบหน้า */
export function SubjectCard({ progress, onAddFirstWork, onOpenSubjectWorks }: SubjectCardProps) {
  const { subject, totalWorks, remainingWorks, overdueWorks, completedRatio } = progress
  const hasOverdue = overdueWorks > 0
  const isEmpty = totalWorks === 0

  const barColor = hasOverdue
    ? 'bg-overdue'
    : completedRatio === 1
      ? 'bg-done'
      : completedRatio > 0
        ? 'bg-progress'
        : 'bg-highlight'

  return (
    <article
      className={`flex h-full flex-col rounded-[18px] border bg-white p-3.5 lg:rounded-[22px] lg:p-4.5 lg:transition-[transform,box-shadow] lg:hover:-translate-y-[3px] lg:hover:shadow-[0_16px_28px_-22px_rgba(42,38,34,.6)] ${
        hasOverdue ? 'border-overdue/30' : 'border-ink/10'
      }`}
    >
      <div className="mb-2.5 flex items-center gap-2 lg:mb-3.5 lg:gap-2.5">
        <span
          aria-hidden="true"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-sand text-[15px] lg:h-9 lg:w-9 lg:text-base"
        >
          {subject.emoji}
        </span>
        <h3 className="min-w-0 truncate text-[13.5px] font-bold lg:text-[15px]">{subject.name}</h3>
      </div>

      {isEmpty ? (
        <>
          <p className="mb-2.5 text-[11.5px] text-ink/75 lg:text-xs">ยังไม่มีงาน</p>
          <button
            type="button"
            onClick={() => onAddFirstWork(subject.id)}
            className="mt-auto min-h-9 self-start rounded-[10px] border border-dashed border-ink/30 px-2.5 text-[11px] font-semibold text-ink/80 transition-colors hover:bg-sand lg:min-h-9.5 lg:px-3 lg:text-[11.5px]"
          >
            + เพิ่มงานแรก
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => onOpenSubjectWorks(subject.id)}
          className="mt-auto block w-full text-left"
        >
          <span
            className={`mb-2.5 block text-[11.5px] lg:text-xs ${
              hasOverdue ? 'font-semibold text-overdue-ink' : 'text-ink/75'
            }`}
          >
            {totalWorks} งาน ·{' '}
            {hasOverdue
              ? `เลยกำหนด ${overdueWorks}`
              : remainingWorks === 0
                ? 'เสร็จหมด'
                : `ค้าง ${remainingWorks}`}
          </span>
          <span className="block h-[7px] overflow-hidden rounded-full bg-sand lg:h-2">
            <span
              className={`animate-grow-bar block h-full rounded-full ${barColor}`}
              style={{ width: `${Math.max(completedRatio * 100, hasOverdue ? 8 : 4)}%` }}
            />
          </span>
        </button>
      )}
    </article>
  )
}
