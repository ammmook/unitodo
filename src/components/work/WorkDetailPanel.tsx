import { useState } from 'react'
import type { Subject, Work, WorkStatus } from '../../types/todolist'
import {
  WORK_STATUS_ORDER,
  WORK_STATUS_STYLE,
  WORK_TYPE_STYLE,
  daysUntilDue,
  formatCreatedAt,
  formatDueDate,
} from '../../utils/workFormatting'
import { PriorityBadge, StatusBadge } from '../common/Badges'
import type { AcademicTerm } from '../../types/todolist'

interface WorkDetailPanelProps {
  work: Work
  subject: Subject | undefined
  term: AcademicTerm
  onClose: () => void
  onChangeStatus: (status: WorkStatus) => void
  onSaveNote: (note: string) => void
  onRequestDelete: () => void
}

/** รายละเอียดงาน — desktop เป็น drawer ขวา · mobile เป็น bottom sheet */
export function WorkDetailPanel({
  work,
  subject,
  term,
  onClose,
  onChangeStatus,
  onSaveNote,
  onRequestDelete,
}: WorkDetailPanelProps) {
  // parent ส่ง key={work.id} มาให้ ทำให้ draft เริ่มใหม่เองเมื่อสลับงาน
  const [noteDraft, setNoteDraft] = useState(work.note)

  const daysLeft = daysUntilDue(work.dueDate)

  return (
    <div className="flex h-full flex-col gap-3.5 overflow-y-auto p-[18px] pb-6 lg:gap-4.5 lg:p-6.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <StatusBadge status={work.status} />
          <h2 className="mt-2.5 text-[22px] font-extrabold -tracking-[0.4px]">{work.title}</h2>
          <p className="mt-1.5 text-[12.5px] text-ink/75 lg:text-[13px]">
            {subject?.name} · {WORK_TYPE_STYLE[work.type].label}
          </p>
        </div>
        <button
          type="button"
          aria-label="ปิดรายละเอียด"
          onClick={onClose}
          className="grid h-9.5 w-9.5 shrink-0 place-items-center rounded-xl border border-ink/12 bg-cream text-[15px] transition-colors hover:bg-sand"
        >
          ✕
        </button>
      </div>

      <p
        className={`flex items-center gap-3 rounded-2xl p-3.5 ${
          daysLeft < 0 ? 'bg-overdue-soft' : 'bg-highlight-soft'
        }`}
      >
        <span className="text-[26px] leading-none font-extrabold lg:text-[28px]">
          {Math.abs(daysLeft)}
        </span>
        <span className="text-xs leading-snug font-semibold lg:text-[12.5px]">
          {daysLeft < 0 ? 'วันที่เลยกำหนดมาแล้ว' : 'วันก่อนถึงกำหนด'}
          <br />
          <span className="font-medium text-ink/75">ส่ง {formatDueDate(work.dueDate)}</span>
        </span>
      </p>

      <dl className="grid grid-cols-[84px_1fr] gap-x-2.5 gap-y-2.5 text-[12.5px] lg:grid-cols-[96px_1fr] lg:gap-y-3 lg:text-[13px]">
        <dt className="font-semibold text-ink/70">Priority</dt>
        <dd>
          {work.status === 'completed' ? (
            <span className="font-semibold text-ink/60">— เสร็จแล้ว</span>
          ) : (
            <PriorityBadge work={work} />
          )}
        </dd>
        <dt className="font-semibold text-ink/70">ประเภท</dt>
        <dd className="font-semibold">{WORK_TYPE_STYLE[work.type].label}</dd>
        <dt className="font-semibold text-ink/70">เทอม</dt>
        <dd className="font-semibold">
          {term.semester} / {term.academicYear}
        </dd>
        <dt className="font-semibold text-ink/70">สร้างเมื่อ</dt>
        <dd className="font-semibold">{formatCreatedAt(work.createdAt)}</dd>
        <dt className="font-semibold text-ink/70">เจ้าของ</dt>
        <dd className="font-semibold break-all">{work.ownerEmail}</dd>
      </dl>

      <div>
        <label
          htmlFor="work-detail-note"
          className="mb-1.5 block text-xs font-bold text-ink/70"
        >
          โน้ต
        </label>
        <textarea
          id="work-detail-note"
          rows={3}
          value={noteDraft}
          onChange={(event) => setNoteDraft(event.target.value)}
          placeholder="จดสิ่งที่ต้องทำก่อนเริ่มงานนี้"
          className="w-full resize-none rounded-[14px] border border-ink/15 bg-white p-3 text-[13px] leading-relaxed font-medium text-ink outline-none lg:bg-cream"
        />
      </div>

      <fieldset className="border-0 p-0">
        <legend className="mb-2 text-xs font-bold text-ink/70">เปลี่ยนสถานะ</legend>
        <div className="flex gap-2">
          {WORK_STATUS_ORDER.map((status) => {
            const style = WORK_STATUS_STYLE[status]
            const isCurrent = status === work.status
            if (status === 'completed') {
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => onChangeStatus('completed')}
                  className={`min-h-11.5 flex-1 rounded-[13px] text-[11.5px] font-bold whitespace-nowrap transition-transform hover:-translate-y-px lg:px-3.5 lg:text-[12.5px] ${
                    isCurrent ? 'bg-done-ink text-white' : 'bg-done text-white'
                  }`}
                >
                  {isCurrent ? '✓ เสร็จแล้ว' : 'Done!'}
                </button>
              )
            }
            return (
              <button
                key={status}
                type="button"
                onClick={() => onChangeStatus(status)}
                aria-pressed={isCurrent}
                className={`min-h-11.5 flex-1 rounded-[13px] text-[11.5px] font-semibold whitespace-nowrap lg:px-3.5 lg:text-[12.5px] ${
                  isCurrent
                    ? 'border-2 border-progress bg-progress-soft font-bold text-progress-ink'
                    : 'border border-ink/15 bg-white text-ink hover:bg-highlight-soft'
                }`}
              >
                {style.icon} <span className="lg:hidden">{style.shortLabel}</span>
                <span className="hidden lg:inline">{style.label}</span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <div className="mt-auto flex gap-2.5 pt-2">
        <button
          type="button"
          onClick={() => onSaveNote(noteDraft)}
          className="min-h-12 flex-1 rounded-[15px] bg-ink text-[13.5px] font-bold text-white transition-transform active:translate-y-px"
        >
          บันทึก
        </button>
        <button
          type="button"
          onClick={onRequestDelete}
          className="min-h-12 rounded-[15px] border border-overdue/40 bg-white px-4 text-[13px] font-semibold text-overdue-ink transition-colors hover:bg-overdue-soft"
        >
          ลบ
        </button>
      </div>
    </div>
  )
}
