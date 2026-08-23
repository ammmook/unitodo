import type { AppUser } from '../../types/todolist'

interface ImpersonationBannerProps {
  viewingUser: AppUser
  onExit: () => void
}

/**
 * แถบเตือนตอน admin สวมบทเป็นผู้ใช้คนอื่น
 * ทุกอย่างที่เห็นและแก้ได้ตอนนี้คือของบัญชีนั้น ไม่ใช่ของแอดมินเอง
 */
export function ImpersonationBanner({ viewingUser, onExit }: ImpersonationBannerProps) {
  return (
    <div
      role="status"
      className="sticky top-0 z-40 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-highlight-shadow/30 bg-highlight px-[18px] py-2.5 text-ink lg:px-8"
    >
      <p className="min-w-0 flex-1 text-[12.5px] font-bold">
        <span aria-hidden="true" className="mr-1.5">
          👁
        </span>
        กำลังดูในนามของ{' '}
        <span className="break-all">{viewingUser.email}</span>
      </p>
      <button
        type="button"
        onClick={onExit}
        className="min-h-9 shrink-0 rounded-[11px] bg-ink px-3 text-[12px] font-bold whitespace-nowrap text-highlight transition-transform active:scale-95"
      >
        กลับเป็นตัวเอง
      </button>
    </div>
  )
}
