import { useCountUp } from '../../hooks/useCountUp'
import type { AcademicTerm, AppUser, Subject, Work } from '../../types/todolist'
import {
  WORK_TYPE_STYLE,
  daysUntilDue,
  describeDueDistance,
  formatDueDate,
} from '../../utils/workFormatting'
import { BrandMark, TermSelector } from '../layout/AppIdentity'
import { UserMenu } from '../layout/UserMenu'

interface DashboardHeroProps {
  nextDueWork: Work | undefined
  subject: Subject | undefined
  remainingCount: number
  overdueCount: number
  term: AcademicTerm
  onTermChange: (term: AcademicTerm) => void
  user: AppUser
  onSignOut: () => void
  onStartWorking: () => void
  onOpenWorkDetail: () => void
}

/** ส่วนหัวสีเข้ม: งานที่ใกล้ถึงกำหนดที่สุด + ตัวเลขสรุป 3 ตัว */
export function DashboardHero({
  nextDueWork,
  subject,
  remainingCount,
  overdueCount,
  term,
  onTermChange,
  user,
  onSignOut,
  onStartWorking,
  onOpenWorkDetail,
}: DashboardHeroProps) {
  const daysLeft = nextDueWork ? Math.max(daysUntilDue(nextDueWork.dueDate), 0) : 0

  return (
    <header
      onMouseMove={(event) => {
        const box = event.currentTarget.getBoundingClientRect()
        event.currentTarget.style.setProperty('--mx', `${event.clientX - box.left}px`)
        event.currentTarget.style.setProperty('--my', `${event.clientY - box.top}px`)
      }}
      className="relative overflow-hidden rounded-b-3xl bg-ink px-[18px] pt-4 pb-6 text-cream lg:rounded-none lg:px-8 lg:pt-0 lg:pb-8"
    >
      {/* ลูกบอลสีลอยช้า ๆ + แสงตามเมาส์
          desktop มีแถบ AppHeader สีเดียวกันต่อจากด้านบน — ไล่แสงให้จางหายที่ขอบบน จะได้ไม่เห็นรอยตัดระหว่างสองแถบ */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden lg:[mask-image:linear-gradient(to_bottom,transparent_0,#000_96px)]"
      >
        <span className="animate-blob-a absolute -top-24 -right-16 h-72 w-72 rounded-full bg-highlight/15 blur-2xl lg:top-6" />
        <span className="animate-blob-b absolute -bottom-28 left-1/4 h-64 w-64 rounded-full bg-progress/25 blur-2xl" />
        <span
          className="absolute inset-0 opacity-0 transition-opacity duration-300 lg:opacity-100"
          style={{ background: 'radial-gradient(260px circle at var(--mx, 70%) var(--my, 30%), rgb(245 195 59 / 0.16), transparent 70%)' }}
        />
      </div>
      <div className="relative">
      {/* แถบแบรนด์เฉพาะมือถือ — desktop ใช้ AppHeader ด้านบนแล้ว */}
      <div className="mb-[18px] flex items-center justify-between gap-2.5 lg:hidden">
        <BrandMark size="sm" />
        <div className="flex items-center gap-2.5">
          <TermSelector term={term} onTermChange={onTermChange} tone="onDark" />
          <UserMenu user={user} onSignOut={onSignOut} />
        </div>
      </div>

      {nextDueWork ? (
        <div className="flex flex-wrap items-center gap-x-9 gap-y-5">
          <div className="min-w-[280px] flex-1">
            <p className="mb-1.5 text-[11px] font-bold tracking-[0.14em] text-highlight lg:text-xs">
              งานที่ใกล้ที่สุด
            </p>
            <h1 className="animate-rise text-[26px] leading-tight font-extrabold -tracking-[0.8px] lg:text-[38px] lg:-tracking-[1.2px]">
              {nextDueWork.title} · {subject?.name ?? 'ไม่มีวิชา'}
            </h1>
            <p className="mt-2 text-[12.5px] text-cream/80 lg:text-sm">
              {WORK_TYPE_STYLE[nextDueWork.type].label} · ส่ง {formatDueDate(nextDueWork.dueDate)} ·{' '}
              {nextDueWork.status === 'inProgress'
                ? 'กำลังทำอยู่'
                : describeDueDistance(nextDueWork.dueDate)}
            </p>
            <div className="mt-4 hidden gap-2.5 lg:flex">
              <button
                type="button"
                onClick={onStartWorking}
                className="press shine min-h-[46px] rounded-[14px] bg-highlight px-5 text-[13.5px] font-bold text-ink"
              >
                {nextDueWork.status === 'inProgress' ? 'ทำต่อเลย' : 'Start Working'}
              </button>
              <button
                type="button"
                onClick={onOpenWorkDetail}
                className="press min-h-[46px] rounded-[14px] border border-cream/30 px-[18px] text-[13.5px] font-semibold text-cream transition-colors hover:bg-cream/15"
              >
                ดูรายละเอียด
              </button>
            </div>
          </div>

          <ul className="flex w-full shrink-0 gap-2 lg:w-auto lg:gap-2.5">
            <HeroStat value={daysLeft} label="วันที่เหลือ" tone="highlight" />
            <HeroStat value={overdueCount} label="เลยกำหนด" tone="overdue" />
            <HeroStat value={remainingCount} label="งานที่เหลือ" tone="plain" />
          </ul>
        </div>
      ) : (
        <p className="py-6 text-lg font-bold">ยังไม่มีงานค้างเลย พักได้ 🎉</p>
      )}

      {nextDueWork && (
        <button
          type="button"
          onClick={onStartWorking}
          className="press shine mt-3.5 min-h-12 w-full rounded-[14px] bg-highlight text-[13.5px] font-bold text-ink lg:hidden"
        >
          {nextDueWork.status === 'inProgress' ? 'ทำต่อเลย' : 'Start Working'}
        </button>
      )}
      </div>
    </header>
  )
}

const STAT_TONE = {
  highlight: { box: 'bg-cream/10', value: 'text-highlight', label: 'text-cream/80' },
  overdue: { box: 'bg-overdue/30', value: 'text-[#ffc0ba]', label: 'text-[#ffc0ba]' },
  plain: { box: 'bg-cream/10', value: 'text-cream', label: 'text-cream/80' },
} as const

function HeroStat({
  value,
  label,
  tone,
}: {
  value: number
  label: string
  tone: keyof typeof STAT_TONE
}) {
  const style = STAT_TONE[tone]
  const shown = useCountUp(value)
  return (
    <li
      className={`lift animate-pop flex-1 rounded-[20px] px-2.5 py-3 text-center lg:w-[100px] lg:flex-none lg:py-4 ${style.box}`}
    >
      <span className={`block text-2xl leading-none font-extrabold lg:text-[34px] ${style.value}`}>
        {shown}
      </span>
      <span className={`mt-1 block text-[10px] font-bold lg:text-[10.5px] ${style.label}`}>
        {label}
      </span>
    </li>
  )
}
