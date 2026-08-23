const BLOCK = 'skeleton-shimmer'

/** การ์ดขาวขอบบาง — โครงเดียวกับการ์ดจริงที่จะมาแทนที่ ตำแหน่งจึงไม่กระโดดตอนโหลดเสร็จ */
const CARD = 'rounded-[20px] border border-ink/10 bg-white p-4 lg:rounded-[22px] lg:p-5.5'

/** ไล่จังหวะ shimmer ทีละแถว ให้เห็นว่ากำลังโหลดอยู่ ไม่ใช่ค้าง */
function delay(seconds: number) {
  return { animationDelay: `${seconds}s` }
}

interface SkeletonBlockProps {
  className: string
  step?: number
}

function SkeletonBlock({ className, step = 0 }: SkeletonBlockProps) {
  return <div className={`${BLOCK} ${className}`} style={delay(step * 0.1)} />
}

/** โครงหน้าตอนกำลังโหลดข้อมูลครั้งแรก — ตามแบบใน mockup ข้อ 3b / 3e */
export function LoadingSkeleton({ variant }: { variant: 'dashboard' | 'list' | 'grid' }) {
  if (variant === 'dashboard') {
    return (
      <div
        aria-hidden="true"
        className="flex flex-col gap-3 px-[18px] py-3 lg:grid lg:grid-cols-[1fr_320px] lg:items-start lg:gap-5 lg:px-8 lg:py-3.5"
      >
        {/* มือถือเอาโดนัทขึ้นก่อนตามแบบ · desktop โดนัทไปอยู่คอลัมน์ขวา */}
        <section className={`${CARD} flex items-center gap-3.5 lg:hidden`}>
          <div
            className={`${BLOCK} h-28 w-28 shrink-0 rounded-full`}
            style={delay(0)}
          />
          <div className="flex flex-1 flex-col gap-2">
            {[0, 1, 2].map((row) => (
              <SkeletonBlock key={row} className="h-6.5 rounded-[10px]" step={row * 1.5} />
            ))}
          </div>
        </section>

        <section className={`${CARD} flex flex-col gap-3.5`}>
          <SkeletonBlock className="h-4.5 w-55 rounded-lg" />
          {[1, 2, 3, 4].map((row) => (
            <SkeletonBlock key={row} className="h-16 rounded-2xl" step={row} />
          ))}
        </section>

        <aside className={`${CARD} hidden flex-col items-center gap-3.5 lg:flex`}>
          <SkeletonBlock className="h-4 w-32.5 rounded-lg" />
          <div
            className={`${BLOCK} h-44 w-44 rounded-full`}
            style={delay(0)}
          />
          {[1.5, 3, 4.5].map((row) => (
            <SkeletonBlock key={row} className="h-10 w-full rounded-[14px]" step={row} />
          ))}
        </aside>
      </div>
    )
  }

  if (variant === 'grid') {
    return (
      <div
        aria-hidden="true"
        className="grid grid-cols-2 gap-2.5 px-[18px] py-3 lg:grid-cols-4 lg:gap-3.5 lg:px-8 lg:py-3.5"
      >
        {[0, 1, 2, 3, 4, 5, 6, 7].map((cell) => (
          <div key={cell} className={`${CARD} flex flex-col gap-2.5`}>
            <SkeletonBlock className="h-9 w-9 rounded-xl" step={cell} />
            <SkeletonBlock className="h-4 w-3/4 rounded-lg" step={cell + 0.5} />
            <SkeletonBlock className="h-2.5 w-full rounded-full" step={cell + 1} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      aria-hidden="true"
      className="flex flex-col gap-2.5 px-[18px] py-3 lg:gap-3 lg:px-8 lg:py-3.5"
    >
      <SkeletonBlock className="h-11.5 rounded-2xl" />
      {[1, 2, 3, 4, 5].map((row) => (
        <SkeletonBlock key={row} className="h-[74px] rounded-2xl" step={row} />
      ))}
    </div>
  )
}

/**
 * โครงทั้งหน้าตอนเปิดแอปครั้งแรก — ยังไม่รู้ว่าเป็นใคร จึงวาดแถบนำทางเป็นโครงไปก่อน
 * ข้อความ role="status" ทำให้ screen reader รู้ว่ากำลังโหลด ไม่ใช่หน้าว่าง
 */
export function AppShellSkeleton({
  variant = 'dashboard',
}: {
  variant?: 'dashboard' | 'list' | 'grid'
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-cream">
      <div className="flex items-center justify-between gap-4 bg-ink px-[18px] py-3.5 lg:px-8 lg:py-4">
        <div className="flex min-w-0 items-center gap-[18px]">
          <span className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="grid h-8 w-8 place-items-center rounded-xl bg-highlight text-sm font-extrabold text-ink"
            >
              T
            </span>
            <strong className="text-[15px] -tracking-[0.2px] text-cream">Todolist</strong>
          </span>
          <div aria-hidden="true" className="hidden gap-1.5 lg:flex">
            {[0, 1, 2].map((tab) => (
              <div
                key={tab}
                className="skeleton-shimmer-dark h-8.5 w-23 rounded-[10px]"
                style={delay(tab * 0.1)}
              />
            ))}
          </div>
        </div>
        <div aria-hidden="true" className="flex items-center gap-3">
          <div className="h-8.5 w-30 rounded-[11px] bg-cream/12" />
          <div className="h-8.5 w-8.5 rounded-full bg-cream/16" />
        </div>
      </div>

      <p
        role="status"
        className="px-[18px] pt-3.5 text-[12.5px] font-semibold text-ink/75 lg:px-8"
      >
        กำลังโหลดงานของคุณ…
      </p>

      <div aria-busy="true" className="flex-1">
        <LoadingSkeleton variant={variant} />
      </div>
    </div>
  )
}
