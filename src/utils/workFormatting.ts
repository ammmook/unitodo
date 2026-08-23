import type { WorkPriority, WorkStatus, WorkType } from '../types/todolist'

const THAI_SHORT_MONTHS = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
]

const MILLISECONDS_PER_DAY = 86_400_000

/** YYYY-MM-DD ตามเวลาเครื่อง (toISOString จะเพี้ยนไป 1 วันในโซนเวลาไทย) */
export function toLocalIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function startOfToday(): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today.getTime()
}

/** จำนวนวันจากวันนี้ถึงกำหนดส่ง — ติดลบคือเลยกำหนด */
export function daysUntilDue(isoDate: string): number {
  const due = new Date(`${isoDate}T00:00:00`).getTime()
  return Math.round((due - startOfToday()) / MILLISECONDS_PER_DAY)
}

/** เช่น "23 ก.ค. 2026" */
export function formatDueDate(isoDate: string, withYear = true): string {
  const date = new Date(`${isoDate}T00:00:00`)
  const dayAndMonth = `${date.getDate()} ${THAI_SHORT_MONTHS[date.getMonth()]}`
  return withYear ? `${dayAndMonth} ${date.getFullYear()}` : dayAndMonth
}

/** เช่น "19 ก.ค. 2026 · 11:45" */
export function formatCreatedAt(isoDateTime: string): string {
  const date = new Date(isoDateTime)
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  return `${formatDueDate(toLocalIsoDate(date))} · ${time}`
}

/** เช่น "อีก 3 วัน" / "วันนี้" / "เลยกำหนด 12 วัน" */
export function describeDueDistance(isoDate: string): string {
  const days = daysUntilDue(isoDate)
  if (days < 0) return `เลยกำหนด ${Math.abs(days)} วัน`
  if (days === 0) return 'ครบกำหนดวันนี้'
  if (days === 1) return 'พรุ่งนี้'
  return `อีก ${days} วัน`
}

export interface StatusStyle {
  label: string
  shortLabel: string
  icon: string
  /** สีเส้นซ้ายการ์ด / จุดบนไทม์ไลน์ */
  accentClass: string
  accentColor: string
  badgeClass: string
}

export const WORK_STATUS_STYLE: Record<WorkStatus, StatusStyle> = {
  notStarted: {
    label: 'ยังไม่ได้ทำ',
    shortLabel: 'ยังไม่ทำ',
    icon: '🕒',
    accentClass: 'border-l-highlight',
    accentColor: 'var(--color-highlight)',
    badgeClass: 'bg-highlight-soft text-highlight-ink',
  },
  inProgress: {
    label: 'In Progress',
    shortLabel: 'Working',
    icon: '⚡',
    accentClass: 'border-l-progress',
    accentColor: 'var(--color-progress)',
    badgeClass: 'bg-progress-soft text-progress-ink',
  },
  completed: {
    label: 'Completed',
    shortLabel: 'Done',
    icon: '✓',
    accentClass: 'border-l-done',
    accentColor: 'var(--color-done)',
    badgeClass: 'bg-done-soft text-done-ink',
  },
}

export const WORK_STATUS_ORDER: WorkStatus[] = ['notStarted', 'inProgress', 'completed']

export const WORK_PRIORITY_STYLE: Record<WorkPriority, { label: string; icon: string; badgeClass: string }> = {
  urgent: {
    label: 'Urgent',
    icon: '🔥',
    badgeClass: 'bg-overdue text-white',
  },
  high: {
    label: 'High',
    icon: '▲',
    badgeClass: 'bg-overdue-soft text-overdue-ink',
  },
  medium: {
    label: 'Medium',
    icon: '■',
    badgeClass: 'bg-highlight-soft text-highlight-ink',
  },
  low: {
    label: 'Low',
    icon: '▼',
    badgeClass: 'bg-sand text-ink/75',
  },
}

/**
 * ความสำคัญของงาน — คำนวณสด ๆ จากสถานะ + จำนวนวันที่เหลือ ไม่ได้เก็บไว้ในฐานข้อมูล
 * (ถ้าเก็บไว้ ค่าจะเพี้ยนทันทีที่วันเปลี่ยน)
 *
 *   เสร็จแล้ว                        → null (ไม่ต้องคำนวณ)
 *   เลยกำหนด หรือ ครบกำหนดวันนี้      → urgent เสมอ
 *   ยังไม่ได้ทำ  เหลือ 1–2 วัน        → high
 *                เหลือ 3 วัน          → medium
 *                เหลือ 4 วันขึ้นไป     → low
 *   กำลังทำ      เหลือ 1 วัน          → high
 *                เหลือ 2–3 วัน        → medium
 *                เหลือ 4 วันขึ้นไป     → low
 */
export function computeWorkPriority(isoDate: string, status: WorkStatus): WorkPriority | null {
  if (status === 'completed') return null

  const days = daysUntilDue(isoDate)
  if (days <= 0) return 'urgent'

  if (status === 'inProgress') {
    if (days === 1) return 'high'
    if (days <= 3) return 'medium'
    return 'low'
  }

  if (days <= 2) return 'high'
  if (days === 3) return 'medium'
  return 'low'
}

export const WORK_TYPE_STYLE: Record<WorkType, { label: string; icon: string }> = {
  homework: { label: 'Homework', icon: '📓' },
  assignment: { label: 'Assignment', icon: '📋' },
  exam: { label: 'Exam', icon: '✒️' },
  presentation: { label: 'Presentation', icon: '🎤' },
  project: { label: 'Project', icon: '🚀' },
  other: { label: 'Other', icon: '💬' },
}

export const WORK_TYPE_ORDER: WorkType[] = ['homework', 'assignment', 'exam', 'presentation', 'project', 'other']

export function isOverdue(isoDate: string, status: WorkStatus): boolean {
  return status !== 'completed' && daysUntilDue(isoDate) < 0
}

/** วันที่วันนี้ในรูปแบบ input[type=date] */
export function todayAsInputValue(): string {
  return toLocalIsoDate(new Date())
}
