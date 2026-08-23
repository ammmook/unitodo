import { useSyncExternalStore } from 'react'

/**
 * อ่านผล media query แบบ reactive ด้วย listener ตัวเดียว
 * ใช้เมื่อ layout mobile กับ desktop ต่างกันจนแชร์ DOM ชุดเดียวไม่ได้
 */
export function useMediaQuery(query: string): boolean {
  const mediaQueryList = getMediaQueryList(query)

  return useSyncExternalStore(
    (notify) => {
      mediaQueryList.addEventListener('change', notify)
      return () => mediaQueryList.removeEventListener('change', notify)
    },
    () => mediaQueryList.matches,
    () => false,
  )
}

const mediaQueryCache = new Map<string, MediaQueryList>()

function getMediaQueryList(query: string): MediaQueryList {
  const cached = mediaQueryCache.get(query)
  if (cached) return cached

  const created = window.matchMedia(query)
  mediaQueryCache.set(query, created)
  return created
}

/** breakpoint เดียวที่ใช้แยก layout mobile / desktop (ตรงกับ lg ของ Tailwind) */
export const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)'
