import { useEffect, useRef, useState } from 'react'

/** ตัวเลขไล่ขึ้นจากค่าเดิมไปค่าใหม่ — easeOutCubic ภายใน duration มิลลิวินาที */
export function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0)
  const shown = useRef(0)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const from = shown.current
    const start = performance.now()
    let frame = 0

    const tick = (now: number) => {
      const progress = reduce ? 1 : Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      shown.current = Math.round(from + (target - from) * eased)
      setValue(shown.current)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, duration])

  return value
}
