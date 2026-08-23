import { useState, type FormEvent } from 'react'
import type { AcademicTerm, NewWorkDraft, Subject, WorkType } from '../../types/todolist'
import {
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
    note: '',
  })
  const [errors, setErrors] = useState<WorkFormErrors>({})
  const [hasTriedSubmit, setHasTriedSubmit] = useState(false)

  const updateDraft = (changes: Partial<NewWorkDraft>) => {
    const nextDraft = { ...draft, ...changes }
    setDraft(nextDraft)
    if (hasTriedSubmit) setErrors(findWorkFormErrors(nextDraft))
  }

  const handleSubmit = (event: FormEvent, requestClose: () => void) => {
    event.preventDefault()
    setHasTriedSubmit(true)

    const nextErrors = findWorkFormErrors(draft)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    // บันทึกแบบ optimistic — งานขึ้นบนจอทันที ส่วนการบันทึกลงชีตทำต่อเบื้องหลัง
    onCreated(draft)
    requestClose()
  }

  const hasBlockingErrors = hasTriedSubmit && Object.keys(errors).length > 0

  return (
    <ModalShell labelledBy="add-work-title" onClose={onClose}>
      {(requestClose) => (
        <FormShell onSubmit={(event) => handleSubmit(event, requestClose)}>
          <SheetGrabber />
          <ModalHeader
            icon="✏️"
            titleId="add-work-title"
            title="เพิ่มงานใหม่"
            subtitle={`เทอม ${term.semester} / ${term.academicYear}`}
            onClose={requestClose}
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
                  placeholder="กรอกหัวข้องานที่ต้องทำ..."
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
              <FormSectionHeading step="2" title="ส่งเมื่อไหร่" />
              <div className="flex flex-col gap-1.5">
                <label htmlFor="new-work-due" className="flex flex-col gap-1.5 text-[13px] font-bold">
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
                  placeholder="กรอกรายละเอียดเพิ่มเติม..."
                  className={`${INPUT_CLASS} resize-none py-3 leading-relaxed`}
                />
              </label>
            </section>
          </div>

          <ModalFooter
            hint="สถานะเริ่มต้น: 🕒 ยังไม่ได้ทำ"
            submitLabel="Add Work"
            onCancel={requestClose}
          />
        </FormShell>
      )}
    </ModalShell>
  )
}

