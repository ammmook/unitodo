interface EmptyStateProps {
  icon: string
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  actionTone?: 'primary' | 'quiet'
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionTone = 'primary',
}: EmptyStateProps) {
  return (
    <div className="rounded-[18px] border border-ink/10 bg-white px-5 py-8 text-center">
      <p aria-hidden="true" className="text-[32px] leading-none">
        {icon}
      </p>
      <h3 className="mt-3 text-base font-extrabold">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-xs text-[12.5px] leading-relaxed text-ink/75">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className={
            actionTone === 'primary'
              ? 'mt-4 min-h-11 rounded-[14px] bg-ink px-5 text-[13px] font-bold text-white shadow-[0_5px_0_var(--color-highlight-shadow)] transition-transform active:translate-y-[3px] active:shadow-[0_2px_0_var(--color-highlight-shadow)]'
              : 'mt-4 min-h-11 rounded-[14px] border border-ink/15 bg-cream px-5 text-[13px] font-bold text-ink transition-colors hover:bg-sand'
          }
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
