import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

const CLOSE_ANIMATION_MS = 160

interface ModalShellProps {
  labelledBy: string
  onClose: () => void
  /** ปิดด้วยการคลิกฉากหลัง / Escape ได้ไหม (ปิดไว้ตอนกำลังบันทึก) */
  dismissable?: boolean
  /**
   * form   — ฟอร์มยาว: มือถือเป็น bottom sheet เต็มความกว้าง · desktop เป็นการ์ด 620px
   * dialog — กล่องยืนยันสั้น ๆ: การ์ด 340px กลางจอเท่ากันทุกขนาดหน้าจอ
   */
  size?: 'form' | 'dialog'
  children: (requestClose: () => void) => ReactNode
}

/**
 * ฉากหลัง + กล่อง dialog ที่ใช้ร่วมกันทุก modal
 * desktop = การ์ดกลางจอ · mobile = bottom sheet ติดขอบล่าง
 */
export function ModalShell({
  labelledBy,
  onClose,
  dismissable = true,
  size = 'form',
  children,
}: ModalShellProps) {
  const isDialog = size === 'dialog'
  const [isClosing, setIsClosing] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const requestClose = useCallback(() => {
    setIsClosing(true)
    setTimeout(onClose, CLOSE_ANIMATION_MS)
  }, [onClose])

  useEffect(() => {
    panelRef.current?.querySelector<HTMLElement>('input, select, textarea, button')?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && dismissable) requestClose()
    }
    document.addEventListener('keydown', onKeyDown)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [dismissable, requestClose])

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center bg-ink/50 ${
        isDialog ? 'items-center p-5 sm:p-6' : 'items-end sm:items-center sm:p-6'
      } ${isClosing ? 'opacity-0 transition-opacity duration-150' : 'animate-scrim-in'}`}
      onMouseDown={(event) => {
        if (dismissable && event.target === event.currentTarget) requestClose()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`flex max-h-[92dvh] w-full flex-col overflow-hidden bg-cream text-ink shadow-[0_40px_70px_-40px_#000] ${
          isDialog
            ? 'max-w-[340px] rounded-[22px]'
            : 'rounded-t-[26px] sm:max-h-full sm:max-w-[620px] sm:rounded-[26px]'
        } ${
          isClosing
            ? 'translate-y-3 opacity-0 transition duration-150'
            : isDialog
              ? 'animate-rise'
              : 'animate-sheet-up sm:animate-modal-in'
        }`}
      >
        {children(requestClose)}
      </div>
    </div>
  )
}

/** แถบหัว sheet บนมือถือ */
export function SheetGrabber() {
  return (
    <span
      aria-hidden="true"
      className="mx-auto mt-3 block h-[5px] w-11 rounded-full bg-ink/20 sm:hidden"
    />
  )
}
