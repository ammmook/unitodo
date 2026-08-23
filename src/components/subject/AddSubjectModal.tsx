import { useState, type FormEvent } from 'react'
import { ACADEMIC_YEAR_OPTIONS, SEMESTER_OPTIONS } from '../../data/mockTodolist'
import type { AcademicTerm, NewSubjectDraft } from '../../types/todolist'
import { ModalShell, SheetGrabber } from '../common/ModalShell'
import {
  FieldError,
  FormSectionHeading,
  FormShell,
  INPUT_CLASS,
  INVALID_INPUT_CLASS,
  ModalFooter,
  ModalHeader,
} from '../work/formParts'

const SAVE_DURATION_MS = 800

interface AddSubjectModalProps {
  term: AcademicTerm
  ownerEmail: string
  isNameTaken: (name: string, term: AcademicTerm) => boolean
  onClose: () => void
  onCreated: (draft: NewSubjectDraft) => void
}

/** ฟอร์มเพิ่มวิชา ใช้โครงเดียวกับ AddWorkModal */
export function AddSubjectModal({
  term,
  ownerEmail,
  isNameTaken,
  onClose,
  onCreated,
}: AddSubjectModalProps) {
  const [draft, setDraft] = useState<NewSubjectDraft>({
    name: '',
    academicYear: term.academicYear,
    semester: term.semester,
  })
  const [nameError, setNameError] = useState<string>()
  const [isSaving, setIsSaving] = useState(false)

  const trimmedName = draft.name.trim()
  const draftTerm: AcademicTerm = { academicYear: draft.academicYear, semester: draft.semester }
  const isNameAvailable = trimmedName !== '' && !isNameTaken(trimmedName, draftTerm)

  const handleSubmit = (event: FormEvent, requestClose: () => void) => {
    event.preventDefault()

    if (trimmedName === '') {
      setNameError('ยังไม่ได้ใส่ชื่อวิชา')
      return
    }
    if (isNameTaken(trimmedName, draftTerm)) {
      setNameError(`มีวิชา “${trimmedName}” ในเทอมนี้อยู่แล้ว`)
      return
    }

    setNameError(undefined)
    setIsSaving(true)
    setTimeout(() => {
      onCreated(draft)
      requestClose()
    }, SAVE_DURATION_MS)
  }

  return (
    <ModalShell labelledBy="add-subject-title" onClose={onClose} dismissable={!isSaving}>
      {(requestClose) => (
        <FormShell onSubmit={(event) => handleSubmit(event, requestClose)}>
          <SheetGrabber />
          <ModalHeader
            icon="📚"
            titleId="add-subject-title"
            title="เพิ่มวิชาใหม่"
            subtitle={`ผูกกับบัญชี ${ownerEmail}`}
            onClose={requestClose}
            closeDisabled={isSaving}
          />

          <div className="flex flex-col gap-4 overflow-y-auto px-[18px] pb-2 lg:gap-4.5 lg:px-6">
            <section className="flex flex-col gap-3">
              <FormSectionHeading step="1" title="วิชาอะไร" />
              <label
                htmlFor="new-subject-name"
                className="flex flex-col gap-1.5 text-[13px] font-bold"
              >
                ชื่อวิชา
                <input
                  id="new-subject-name"
                  type="text"
                  value={draft.name}
                  onChange={(event) => {
                    setDraft({ ...draft, name: event.target.value })
                    setNameError(undefined)
                  }}
                  placeholder="เช่น Golang, Finance and Accounting"
                  aria-invalid={Boolean(nameError)}
                  aria-describedby={nameError ? 'new-subject-name-error' : undefined}
                  className={nameError ? INVALID_INPUT_CLASS : INPUT_CLASS}
                />
              </label>
              <FieldError id="new-subject-name-error" message={nameError} />
            </section>

            <hr className="border-0 border-t border-ink/10" />

            <section className="flex flex-col gap-3">
              <FormSectionHeading step="2" title="เรียนเทอมไหน" />
              <div className="grid grid-cols-2 items-end gap-3">
                <label
                  htmlFor="new-subject-year"
                  className="flex flex-col gap-1.5 text-[13px] font-bold"
                >
                  ปีการศึกษา
                  <select
                    id="new-subject-year"
                    value={draft.academicYear}
                    onChange={(event) =>
                      setDraft({ ...draft, academicYear: Number(event.target.value) })
                    }
                    className={INPUT_CLASS}
                  >
                    {ACADEMIC_YEAR_OPTIONS.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </label>
                <label
                  htmlFor="new-subject-semester"
                  className="flex flex-col gap-1.5 text-[13px] font-bold"
                >
                  เทอม
                  <select
                    id="new-subject-semester"
                    value={draft.semester}
                    onChange={(event) =>
                      setDraft({ ...draft, semester: Number(event.target.value) })
                    }
                    className={INPUT_CLASS}
                  >
                    {SEMESTER_OPTIONS.map((semester) => (
                      <option key={semester} value={semester}>
                        {semester}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {isNameAvailable && (
                <p className="flex items-center gap-2.5 rounded-[14px] bg-done-soft px-3.5 py-3 text-[12.5px] font-semibold text-done-ink">
                  <span aria-hidden="true">✓</span>
                  ชื่อนี้ยังไม่มีในเทอม {draft.semester} / {draft.academicYear} — ใช้ได้เลย
                </p>
              )}
            </section>
          </div>

          <ModalFooter
            hint="เพิ่มแล้วค่อยใส่งานทีหลังได้"
            submitLabel="Add Subject"
            isSaving={isSaving}
            onCancel={requestClose}
          />
        </FormShell>
      )}
    </ModalShell>
  )
}
