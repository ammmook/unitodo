import { useEffect, useRef, useState } from 'react'
import type { AppUser } from '../../types/todolist'

interface UserMenuProps {
  user: AppUser
  onSignOut: () => void
}

/** avatar มุมขวาบน — กดแล้วเปิดเมนูโปรไฟล์ที่มีปุ่มออกจากระบบ */
export function UserMenu({ user, onSignOut }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setIsOpen(false)
      triggerRef.current?.focus()
    }

    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen])

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`บัญชีของ ${user.email}`}
        onClick={() => setIsOpen((wasOpen) => !wasOpen)}
        className={`grid h-[34px] w-[34px] place-items-center rounded-full bg-highlight text-[13px] font-bold text-ink transition-shadow ${
          isOpen ? 'ring-2 ring-cream/70 ring-offset-2 ring-offset-ink' : ''
        }`}
      >
        {user.displayName.charAt(0).toUpperCase()}
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="เมนูบัญชี"
          className="animate-rise absolute top-full right-0 z-50 mt-2 w-60 overflow-hidden rounded-[18px] border border-ink/10 bg-cream text-ink shadow-[0_24px_44px_-24px_rgba(42,38,34,.9)]"
        >
          <div className="flex items-center gap-2.5 border-b border-ink/10 bg-white px-3.5 py-3">
            <span
              aria-hidden="true"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-highlight text-sm font-bold"
            >
              {user.displayName.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-bold">{user.displayName}</p>
              <p className="truncate text-[11px] text-ink/75">{user.email}</p>
            </div>
          </div>

          {user.isAdmin && (
            <p className="px-3.5 pt-2.5 text-[11px] font-bold text-highlight-ink">★ สิทธิ์ Admin</p>
          )}

          <div className="p-2.5">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false)
                onSignOut()
              }}
              className="flex min-h-11 w-full items-center gap-2.5 rounded-[13px] border border-overdue/35 bg-white px-3 text-[13px] font-bold text-overdue-ink transition-colors hover:bg-overdue-soft"
            >
              <span aria-hidden="true">↩</span>
              ออกจากระบบ
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
