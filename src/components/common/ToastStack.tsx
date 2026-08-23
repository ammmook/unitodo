import type { Toast, ToastTone } from '../../types/todolist'

const TONE_STYLE: Record<ToastTone, { card: string; iconBox: string; title: string; description: string; action: string }> = {
  success: {
    card: 'bg-ink text-cream',
    iconBox: 'bg-done text-white animate-pop',
    title: 'text-cream',
    description: 'text-cream/80',
    action: 'border border-cream/30 text-cream hover:bg-cream/15',
  },
  info: {
    card: 'bg-progress-soft border border-progress/30',
    iconBox: 'bg-progress text-white',
    title: 'text-progress-ink-strong',
    description: 'text-progress-ink',
    action: 'bg-progress text-white',
  },
  neutral: {
    card: 'bg-white border border-ink/10',
    iconBox: 'bg-sand',
    title: 'text-ink',
    description: 'text-ink/75',
    action: 'border border-ink/15 bg-cream text-ink hover:bg-sand',
  },
  error: {
    card: 'bg-overdue-soft border border-overdue/40',
    iconBox: 'bg-overdue text-white',
    title: 'text-overdue-ink-strong',
    description: 'text-overdue-ink-strong/85',
    action: 'bg-overdue text-white',
  },
  progress: {
    card: 'bg-white border border-ink/10',
    iconBox: 'bg-highlight-soft',
    title: 'text-ink',
    description: 'text-ink/75',
    action: 'border border-ink/15 bg-cream text-ink hover:bg-sand',
  },
}

interface ToastStackProps {
  toasts: Toast[]
  onDismiss: (id: number) => void
}

/** โผล่มุมขวาล่างบน desktop · ลอยเหนือ tab bar บนมือถือ */
export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  if (toasts.length === 0) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-3 bottom-24 z-60 flex flex-col gap-2.5 lg:inset-x-auto lg:right-6 lg:bottom-6 lg:w-[380px]"
    >
      {toasts.map((toast) => {
        const tone = TONE_STYLE[toast.tone]
        return (
          <article
            key={toast.id}
            className={`animate-rise pointer-events-auto flex items-center gap-3 rounded-2xl p-3.5 shadow-[0_16px_30px_-22px_rgba(42,38,34,.9)] ${tone.card}`}
          >
            <span
              aria-hidden="true"
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-base font-bold ${tone.iconBox}`}
            >
              {toast.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className={`text-[13.5px] font-bold ${tone.title}`}>{toast.title}</p>
              {toast.description && (
                <p className={`truncate text-[11.5px] ${tone.description}`}>{toast.description}</p>
              )}
            </div>
            {toast.actionLabel && toast.onAction && (
              <button
                type="button"
                onClick={() => {
                  toast.onAction?.()
                  onDismiss(toast.id)
                }}
                className={`min-h-9 shrink-0 rounded-xl px-3 text-xs font-bold whitespace-nowrap ${tone.action}`}
              >
                {toast.actionLabel}
              </button>
            )}
            <button
              type="button"
              aria-label="ปิดการแจ้งเตือน"
              onClick={() => onDismiss(toast.id)}
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-[10px] text-[13px] ${
                toast.tone === 'success' ? 'bg-cream/15 text-cream' : 'bg-ink/6 text-ink'
              }`}
            >
              ✕
            </button>
          </article>
        )
      })}
    </div>
  )
}
