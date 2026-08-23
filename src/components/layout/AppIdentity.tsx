import type { AcademicTerm, AppUser } from '../../types/todolist'

/** โลโก้ + ชื่อแอป */
export function BrandMark({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const badgeSize = size === 'sm' ? 'h-[30px] w-[30px] text-[13px]' : 'h-8 w-8 text-sm'
  return (
    <span className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className={`grid ${badgeSize} place-items-center rounded-xl bg-highlight font-extrabold text-ink`}
      >
        T
      </span>
      <strong className="text-[15px] -tracking-[0.2px]">Todolist</strong>
    </span>
  )
}

/** ปุ่มเลือกปี/เทอม — mock ไว้ก่อน ยังไม่มีเมนูให้เลือก */
export function TermChip({ term, tone }: { term: AcademicTerm; tone: 'onDark' | 'onLight' }) {
  const toneClass =
    tone === 'onDark'
      ? 'border-cream/30 text-cream hover:bg-cream/15'
      : 'border-ink/15 bg-white text-ink hover:bg-sand'

  return (
    <button
      type="button"
      className={`min-h-10 rounded-xl border px-3 text-[12.5px] font-semibold whitespace-nowrap transition-colors ${toneClass}`}
    >
      {term.academicYear} · เทอม {term.semester} ▾
    </button>
  )
}

export function UserAvatar({ user }: { user: AppUser }) {
  return (
    <span
      title={user.email}
      className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-highlight text-[13px] font-bold text-ink"
    >
      {user.displayName.charAt(0).toUpperCase()}
    </span>
  )
}
