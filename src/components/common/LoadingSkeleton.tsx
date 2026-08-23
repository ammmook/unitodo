const BLOCK = 'skeleton-shimmer rounded-2xl'

/** โครงหน้าตอนกำลังโหลดข้อมูลครั้งแรก */
export function LoadingSkeleton({ variant }: { variant: 'dashboard' | 'list' | 'grid' }) {
  if (variant === 'dashboard') {
    return (
      <div aria-hidden="true" className="flex flex-col gap-4 p-[18px] lg:grid lg:grid-cols-[1fr_320px] lg:items-start lg:gap-5 lg:p-8">
        <div className="flex flex-col gap-3">
          <div className={`${BLOCK} h-6 w-40`} />
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className={`${BLOCK} h-[68px]`} />
          ))}
        </div>
        <div className={`${BLOCK} h-[360px]`} />
      </div>
    )
  }

  if (variant === 'grid') {
    return (
      <div aria-hidden="true" className="grid grid-cols-2 gap-2.5 p-[18px] lg:grid-cols-4 lg:gap-3.5 lg:p-8">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((cell) => (
          <div key={cell} className={`${BLOCK} h-[120px] lg:h-[150px]`} />
        ))}
      </div>
    )
  }

  return (
    <div aria-hidden="true" className="flex flex-col gap-2.5 p-[18px] lg:gap-3 lg:p-8">
      <div className={`${BLOCK} h-11.5`} />
      {[0, 1, 2, 3, 4].map((row) => (
        <div key={row} className={`${BLOCK} h-[74px]`} />
      ))}
    </div>
  )
}
