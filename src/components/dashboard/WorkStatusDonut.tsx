import type { WorkStatusSummary } from '../../hooks/useTodolistData'
import type { WorkStatus } from '../../types/todolist'
import { WORK_STATUS_ORDER, WORK_STATUS_STYLE } from '../../utils/workFormatting'

const RADIUS = 76
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
/** เว้นช่องว่างเล็ก ๆ ระหว่างส่วนโค้ง ให้อ่านง่ายเหมือนใน design */
const SEGMENT_GAP = 6

interface WorkStatusDonutProps {
  summary: WorkStatusSummary
  size: number
  strokeWidth: number
}

interface DonutSegment {
  status: WorkStatus
  arcLength: number
  dashOffset: number
}

/** แปลงจำนวนงานแต่ละสถานะเป็นความยาวส่วนโค้ง เรียงต่อกันรอบวง */
function buildDonutSegments(summary: WorkStatusSummary): DonutSegment[] {
  let drawnLength = 0

  return WORK_STATUS_ORDER.flatMap((status) => {
    const count = summary[status]
    if (count === 0) return []

    const arcLength = Math.max((count / summary.total) * CIRCUMFERENCE - SEGMENT_GAP, 1)
    const segment: DonutSegment = { status, arcLength, dashOffset: -drawnLength }
    drawnLength += arcLength + SEGMENT_GAP
    return segment
  })
}

export function WorkStatusDonut({ summary, size, strokeWidth }: WorkStatusDonutProps) {
  const segments = buildDonutSegments(summary)

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        role="img"
        aria-label={`ยังไม่ทำ ${summary.notStarted}, กำลังทำ ${summary.inProgress}, เสร็จแล้ว ${summary.completed} จาก ${summary.total} งาน`}
      >
        <circle cx="100" cy="100" r={RADIUS} fill="none" stroke="var(--color-sand)" strokeWidth={strokeWidth} />
        <g transform="rotate(-90 100 100)" fill="none" strokeWidth={strokeWidth} strokeLinecap="round">
          {segments.map((segment, index) => (
            <circle
              key={segment.status}
              cx="100"
              cy="100"
              r={RADIUS}
              stroke={WORK_STATUS_STYLE[segment.status].accentColor}
              strokeDasharray={`${segment.arcLength} ${CIRCUMFERENCE}`}
              strokeDashoffset={segment.dashOffset}
              className="animate-draw-donut"
              style={{ animationDelay: `${index * 0.22}s` }}
            />
          ))}
        </g>
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <span className="text-[2em] leading-none font-extrabold -tracking-[1px]" style={{ fontSize: size * 0.19 }}>
          {summary.total}
        </span>
        <span className="mt-1 text-[9.5px] font-bold tracking-[0.1em] text-ink/70">TOTAL งาน</span>
      </div>
    </div>
  )
}

/** รายการสรุปจำนวนงานแต่ละสถานะ ใช้คู่กับ donut */
export function WorkStatusLegend({ summary }: { summary: WorkStatusSummary }) {
  return (
    <ul className="flex min-w-0 flex-1 flex-col gap-2">
      {WORK_STATUS_ORDER.map((status) => {
        const style = WORK_STATUS_STYLE[status]
        return (
          <li
            key={status}
            className={`flex items-center gap-2.5 rounded-[14px] px-3 py-2.5 ${style.badgeClass}`}
          >
            <span aria-hidden="true" className="text-[13px]">
              {style.icon}
            </span>
            <span className="flex-1 text-[12.5px] font-semibold">{style.label}</span>
            <strong className="text-[17px]">{summary[status]}</strong>
          </li>
        )
      })}
    </ul>
  )
}
