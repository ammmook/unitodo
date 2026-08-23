import { useCallback, useRef, useState } from 'react'
import type { Toast } from '../types/todolist'

const TOAST_LIFETIME_MS = 4000

export interface ToastController {
  toasts: Toast[]
  showToast: (toast: Omit<Toast, 'id'>) => void
  dismissToast: (id: number) => void
}

/** คิว toast มุมขวาล่าง — หายเองใน 4 วินาที ตาม design */
export function useToasts(): ToastController {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextToastId = useRef(0)
  const timeoutIds = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const dismissToast = useCallback((id: number) => {
    const timeoutId = timeoutIds.current.get(id)
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutIds.current.delete(id)
    }
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = nextToastId.current++
      setToasts((current) => [...current, { ...toast, id }])
      timeoutIds.current.set(
        id,
        setTimeout(() => dismissToast(id), TOAST_LIFETIME_MS),
      )
    },
    [dismissToast],
  )

  return { toasts, showToast, dismissToast }
}
