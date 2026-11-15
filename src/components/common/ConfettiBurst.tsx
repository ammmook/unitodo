const COLORS = ['#f5c33b', '#3f5fc9', '#1f7a56', '#ff8a5c', '#c1443b', '#fdfbf6']
const PIECES = 16

/** ลูกกระดาษสีพุ่งออกจากจุดกึ่งกลางของแม่ (แม่ต้อง relative) — เล่นครั้งเดียวแล้วค้างโปร่งใส */
export function ConfettiBurst() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 z-10">
      {Array.from({ length: PIECES }, (_, index) => {
        const angle = (index / PIECES) * Math.PI * 2 + (index % 2) * 0.2
        const distance = 34 + (index % 4) * 14
        return (
          <span
            key={index}
            className="animate-confetti absolute top-1/2 left-1/2 block h-[7px] w-[7px] rounded-[2px]"
            style={{
              background: COLORS[index % COLORS.length],
              ['--dx' as string]: `${Math.cos(angle) * distance}px`,
              ['--dy' as string]: `${Math.sin(angle) * distance - 10}px`,
              ['--rot' as string]: `${(index % 2 ? 1 : -1) * (180 + index * 25)}deg`,
            }}
          />
        )
      })}
    </span>
  )
}
