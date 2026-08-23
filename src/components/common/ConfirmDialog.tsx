import { ModalShell } from './ModalShell'

interface ConfirmDialogProps {
  icon: string
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

/** ใช้เฉพาะ action ที่ย้อนกลับไม่ได้ เช่น ลบงาน / ลบวิชา */
export function ConfirmDialog({
  icon,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <ModalShell labelledBy="confirm-dialog-title" onClose={onCancel} size="dialog">
      {(requestClose) => (
        <div className="p-6 text-center">
          <span
            aria-hidden="true"
            className="mx-auto mb-3.5 grid h-12 w-12 place-items-center rounded-2xl bg-overdue-soft text-xl"
          >
            {icon}
          </span>
          <h2 id="confirm-dialog-title" className="text-lg font-extrabold">
            {title}
          </h2>
          <p className="mt-2 mb-4.5 text-[12.5px] leading-relaxed text-pretty text-ink/75">
            {description}
          </p>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={requestClose}
              className="min-h-12 flex-1 rounded-[14px] border border-ink/15 bg-white text-[13.5px] font-bold text-ink transition-colors hover:bg-sand"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="min-h-12 flex-1 rounded-[14px] bg-overdue text-[13.5px] font-bold text-white transition-transform hover:-translate-y-px active:translate-y-px"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      )}
    </ModalShell>
  )
}
