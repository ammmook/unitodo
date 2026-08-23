import type { FormEvent, ReactNode } from 'react'

/** ชิ้นส่วนฟอร์มที่ modal เพิ่มงาน / เพิ่มวิชา ใช้ร่วมกัน */

export const INPUT_CLASS =
  'min-h-13 rounded-[15px] border border-ink/15 bg-white px-3.5 text-[14.5px] font-semibold text-ink outline-none transition-colors focus:border-ink/40'

export const INVALID_INPUT_CLASS =
  'min-h-13 rounded-[15px] border-2 border-overdue bg-overdue-soft px-3.5 text-[14.5px] font-semibold text-ink outline-none'

export function FormShell({
  onSubmit,
  children,
}: {
  onSubmit: (event: FormEvent) => void
  children: ReactNode
}) {
  return (
    <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-col">
      {children}
    </form>
  )
}

interface ModalHeaderProps {
  icon: string
  titleId: string
  title: string
  subtitle: string
  onClose: () => void
  closeDisabled?: boolean
}

export function ModalHeader({
  icon,
  titleId,
  title,
  subtitle,
  onClose,
  closeDisabled = false,
}: ModalHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 px-[18px] pt-3.5 pb-3.5 lg:px-6 lg:pt-5.5 lg:pb-4">
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-[15px] bg-highlight text-[19px] lg:h-10.5 lg:w-10.5"
        >
          {icon}
        </span>
        <div className="min-w-0">
          <h2 id={titleId} className="text-[19px] font-extrabold -tracking-[0.4px] lg:text-xl">
            {title}
          </h2>
          <p className="mt-0.5 truncate text-[11.5px] text-ink/75 lg:text-xs">{subtitle}</p>
        </div>
      </div>
      <button
        type="button"
        aria-label="ปิด"
        onClick={onClose}
        disabled={closeDisabled}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] border border-ink/15 bg-white text-[15px] transition-[background-color,transform] hover:bg-sand active:scale-95 disabled:opacity-50 lg:h-10 lg:w-10"
      >
        ✕
      </button>
    </div>
  )
}

interface FormSectionHeadingProps {
  step: string
  title: string
  hint?: string
  tone?: 'strong' | 'quiet'
}

export function FormSectionHeading({ step, title, hint, tone = 'strong' }: FormSectionHeadingProps) {
  return (
    <h3 className="flex items-center gap-2 text-[11.5px] font-extrabold tracking-[0.1em] text-ink/75">
      <span
        aria-hidden="true"
        className={`grid h-4.5 w-4.5 place-items-center rounded-md text-[10px] ${
          tone === 'strong' ? 'bg-ink text-highlight' : 'bg-sand text-ink'
        }`}
      >
        {step}
      </span>
      {title}
      {hint && <span className="font-semibold tracking-normal">{hint}</span>}
    </h3>
  )
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} className="flex items-center gap-2 text-xs font-semibold text-overdue-ink-strong">
      <span aria-hidden="true">!</span>
      {message}
    </p>
  )
}

interface ModalFooterProps {
  hint: string
  submitLabel: string
  /** โชว์สปินเนอร์ระหว่างรอบันทึก — ฟอร์มที่บันทึกแบบ optimistic ไม่ต้องส่งมา */
  isSaving?: boolean
  onCancel: () => void
}

export function ModalFooter({ hint, submitLabel, isSaving = false, onCancel }: ModalFooterProps) {
  return (
    <div className="mt-4 flex items-center gap-2.5 border-t border-ink/10 bg-white px-[18px] py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] lg:px-6 lg:py-4">
      <p className="hidden flex-1 text-[11.5px] text-ink/75 sm:block">{hint}</p>
      <button
        type="button"
        onClick={onCancel}
        disabled={isSaving}
        className="min-h-13 flex-1 rounded-[15px] border border-ink/20 bg-cream px-5 text-sm font-bold text-ink transition-colors hover:bg-sand disabled:opacity-60 sm:flex-none"
      >
        ยกเลิก
      </button>
      <button
        type="submit"
        disabled={isSaving}
        aria-busy={isSaving}
        className="flex min-h-13 flex-1 items-center justify-center gap-2.5 rounded-[15px] bg-ink px-6 text-[14.5px] font-bold text-white shadow-[0_5px_0_var(--color-highlight-shadow)] transition-[transform,box-shadow] hover:-translate-y-px hover:shadow-[0_6px_0_var(--color-highlight-shadow)] active:translate-y-[3px] active:shadow-[0_2px_0_var(--color-highlight-shadow)] disabled:cursor-progress sm:flex-none"
      >
        {isSaving && (
          <span
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-[2.5px] border-cream/35 border-t-highlight"
          />
        )}
        {isSaving ? 'กำลังบันทึก…' : submitLabel}
      </button>
    </div>
  )
}
