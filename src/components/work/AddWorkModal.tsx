import { useState, type FormEvent } from 'react'
import type {
  AcademicTerm,
  NewWorkDraft,
  Subject,
  WorkPriority,
  WorkType,
} from '../../types/todolist'
import {
  WORK_PRIORITY_ORDER,
  WORK_PRIORITY_STYLE,
  WORK_TYPE_ORDER,
  WORK_TYPE_STYLE,
  daysUntilDue,
  todayAsInputValue,
} from '../../utils/workFormatting'
import { ModalShell, SheetGrabber } from '../common/ModalShell'
import {
  FieldError,
  FormSectionHeading,
  FormShell,
  INPUT_CLASS,
  INVALID_INPUT_CLASS,
  ModalFooter,
  ModalHeader,
} from './formParts'

const SAVE_DURATION_MS = 900

interface AddWorkModalProps {
  subjects: Subject[]
  term: AcademicTerm
  presetSubjectId?: string
  onClose: () => void
  onCreated: (draft: NewWorkDraft) => void
}

interface WorkFormErrors {
  title?: string
  subjectId?: string
  dueDate?: string
}

function findWorkFormErrors(draft: NewWorkDraft): WorkFormErrors {
  const errors: WorkFormErrors = {}
  if (draft.title.trim() === '') errors.title = 'ต้องใส่ชื่องานก่อน'
  if (draft.subjectId === '') errors.subjectId = 'ยังไม่ได้เลือกวิชา'
  if (draft.dueDate === '') errors.dueDate = 'เลือกวันกำหนดส่งด้วยนะ'
  else if (daysUntilDue(draft.dueDate) < 0) errors.dueDate = 'วันที่นี้ผ่านมาแล้ว เลือกวันใหม่ไหม?'
  return errors
}

/** ฟอร์มเพิ่มงาน 3 กลุ่ม: งานอะไร -> ส่งเมื่อไหร่ -> รายละเอียดเพิ่ม */
export function AddWorkModal({
  subjects,
  term,
  presetSubjectId = '',
  onClose,
  onCreated,
}: AddWorkModalProps) {
  const [draft, setDraft] = useState<NewWorkDraft>({
    title: '',
    subjectId: presetSubjectId,
    type: '',
    dueDate: todayAsInputValue(),
    priority: 'medium',
    note: '',
  })
  const [errors, setErrors] = useState<WorkFormErrors>({})
  const [hasTriedSubmit, setHasTriedSubmit] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const updateDraft = (changes: Partial<NewWorkDraft>) => {
    const nextDraft = { ...draft, ...changes }
    setDraft(nextDraft)
    if (hasTriedSubmit) setErrors(findWorkFormErrors(nextDraft))
  }

  const daysBeforeDue = draft.dueDate === '' ? null : daysUntilDue(draft.dueDate)

  const handleSubmit = (event: FormEvent, requestClose: () => void) => {
    event.preventDefault()
    setHasTriedSubmit(true)

    const nextErrors = findWorkFormErrors(draft)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setIsSaving(true)
    setTimeout(() => {
      onCreated(draft)
      requestClose()
    }, SAVE_DURATION_MS)
  }

  const hasBlockingErrors = hasTriedSubmit && Object.keys(errors).length > 0

  return (
    <ModalShell labelledBy="add-work-title" onClose={onClose} dismissable={!isSaving}>
      {(requestClose) => (
        <FormShell onSubmit={(event) => handleSubmit(event, requestClose)}>
          <SheetGrabber />
          <ModalHeader
            icon="✏️"
            titleId="add-work-title"
            title="เพิ่มงานใหม่"
            subtitle={`เทอม ${term.semester} / ${term.academicYear}`}
            onClose={requestClose}
            closeDisabled={isSaving}
          />

          <div className="flex flex-col gap-4 overflow-y-auto px-[18px] pb-2 lg:gap-4.5 lg:px-6">
            {hasBlockingErrors && (
              <p
                role="alert"
                className="flex items-center gap-3 rounded-2xl border border-overdue/40 bg-overdue-soft p-3.5"
              >
                <span
                  aria-hidden="true"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-overdue text-base font-bold text-white"
                >
                  !
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-bold text-overdue-ink-strong">
                    ยังบันทึกไม่ได้
                  </span>
                  <span className="block text-[11.5px] text-overdue-ink-strong/85">
                    เติมชื่องาน วิชา และกำหนดส่งให้ครบก่อนนะ
                  </span>
                </span>
              </p>
            )}

            <section className="flex flex-col gap-3">
              <FormSectionHeading step="1" title="งานอะไร" />
              <label htmlFor="new-work-title" className="flex flex-col gap-1.5 text-[13px] font-bold">
                ชื่องาน
                <input
                  id="new-work-title"
                  type="text"
                  value={draft.title}
                  onChange={(event) => updateDraft({ title: event.target.value })}
                  placeholder="เช่น Lab 3 วาดดอกกระบองเพชร"
                  aria-invalid={Boolean(errors.title)}
                  aria-describedby={errors.title ? 'new-work-title-error' : undefined}
                  className={errors.title ? INVALID_INPUT_CLASS : INPUT_CLASS}
                />
              </label>
              <FieldError id="new-work-title-error" message={errors.title} />

              <div className="grid gap-3 lg:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="new-work-subject"
                    className="flex flex-col gap-1.5 text-[13px] font-bold"
                  >
                    วิชา
                    <select
                      id="new-work-subject"
                      value={draft.subjectId}
                      onChange={(event) => updateDraft({ subjectId: event.target.value })}
                      aria-invalid={Boolean(errors.subjectId)}
                      aria-describedby={errors.subjectId ? 'new-work-subject-error' : undefined}
                      className={errors.subjectId ? INVALID_INPUT_CLASS : INPUT_CLASS}
                    >
                      <option value="">เลือกวิชา…</option>
                      {subjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.emoji} {subject.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <FieldError id="new-work-subject-error" message={errors.subjectId} />
                </div>

                <label
                  htmlFor="new-work-type"
                  className="flex flex-col gap-1.5 text-[13px] font-bold"
                >
                  ประเภทของงาน
                  <select
                    id="new-work-type"
                    value={draft.type}
                    onChange={(event) => updateDraft({ type: event.target.value as WorkType })}
                    className={INPUT_CLASS}
                  >
                    <option value="">เลือกประเภท…</option>
                    {WORK_TYPE_ORDER.map((type) => (
                      <option key={type} value={type}>
                        {WORK_TYPE_STYLE[type].icon} {WORK_TYPE_STYLE[type].label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <hr className="border-0 border-t border-ink/10" />

            <section className="flex flex-col gap-3">
              <FormSectionHeading step="2" title="ส่งเมื่อไหร่ · สำคัญแค่ไหน" />
              <div className="grid items-start gap-3 lg:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="new-work-due"
                    className="flex flex-col gap-1.5 text-[13px] font-bold"
                  >
                    กำหนดส่ง
                    <input
                      id="new-work-due"
                      type="date"
                      value={draft.dueDate}
                      onChange={(event) => updateDraft({ dueDate: event.target.value })}
                      aria-invalid={Boolean(errors.dueDate)}
                      aria-describedby={errors.dueDate ? 'new-work-due-error' : undefined}
                      className={errors.dueDate ? INVALID_INPUT_CLASS : INPUT_CLASS}
                    />
                  </label>
                  <FieldError id="new-work-due-error" message={errors.dueDate} />
                </div>

                <fieldset className="flex flex-col gap-1.5 border-0 p-0">
                  <legend className="pb-1.5 text-[13px] font-bold">ความสำคัญ</legend>
                  <div className="flex gap-1.5">
                    {WORK_PRIORITY_ORDER.map((priority) => (
                      <PriorityOption
                        key={priority}
                        priority={priority}
                        isSelected={draft.priority === priority}
                        onSelect={() => updateDraft({ priority })}
                      />
                    ))}
                  </div>
                </fieldset>
              </div>

              {daysBeforeDue !== null && daysBeforeDue >= 0 && (
                <p className="flex items-center gap-2.5 rounded-[14px] bg-highlight-soft px-3.5 py-3 text-[12.5px] font-semibold text-highlight-ink">
                  <span aria-hidden="true">⏰</span>
                  {daysBeforeDue === 0
                    ? 'ครบกำหนดวันนี้ — จะขึ้นบนสุดของ “ใกล้ถึงกำหนด” ให้เอง'
                    : `อีก ${daysBeforeDue} วันก่อนถึงกำหนด — จะขึ้นในการ์ด “ใกล้ถึงกำหนด” ให้เอง`}
                </p>
              )}
            </section>

            <hr className="border-0 border-t border-ink/10" />

            <section className="flex flex-col gap-3 pb-1">
              <FormSectionHeading
                step="3"
                title="รายละเอียดเพิ่ม"
                hint="(ไม่ใส่ก็ได้)"
                tone="quiet"
              />
              <label htmlFor="new-work-note" className="flex flex-col gap-1.5 text-[13px] font-bold">
                โน้ตช่วยเตือนตัวเอง
                <textarea
                  id="new-work-note"
                  rows={2}
                  value={draft.note}
                  onChange={(event) => updateDraft({ note: event.target.value })}
                  placeholder="เช่น อ่านบท 4 ให้จบก่อน แล้วค่อยเริ่มวาด"
                  className={`${INPUT_CLASS} resize-none py-3 leading-relaxed`}
                />
              </label>
            </section>
          </div>

          <ModalFooter
            hint="สถานะเริ่มต้น: 🕒 ยังไม่ได้ทำ"
            submitLabel="Add Work"
            isSaving={isSaving}
            onCancel={requestClose}
          />
        </FormShell>
      )}
    </ModalShell>
  )
}

const SELECTED_PRIORITY_CLASS: Record<WorkPriority, string> = {
  high: 'border-2 border-overdue bg-overdue-soft text-overdue-ink-strong',
  medium: 'border-2 border-highlight-shadow bg-highlight-soft text-highlight-ink',
  low: 'border-2 border-ink/40 bg-sand text-ink',
}

function PriorityOption({
  priority,
  isSelected,
  onSelect,
}: {
  priority: WorkPriority
  isSelected: boolean
  onSelect: () => void
}) {
  const style = WORK_PRIORITY_STYLE[priority]
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onSelect}
      className={`min-h-13 flex-1 rounded-[15px] text-[12.5px] whitespace-nowrap transition-colors ${
        isSelected
          ? `font-extrabold ${SELECTED_PRIORITY_CLASS[priority]}`
          : 'border border-ink/15 bg-white font-semibold text-ink hover:bg-sand'
      }`}
    >
      {style.icon} {style.formLabel}
    </button>
  )
}
