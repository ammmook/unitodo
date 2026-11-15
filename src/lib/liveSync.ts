import { createRealtimeClient, type SealedLiveQuery } from '@neon/realtime/client'
import { api, type RequestContext } from './api'
import type { Subject, Work, WorkStatus, WorkType } from '../types/todolist'

/**
 * Neon Realtime — subscribe query ที่ backend ซีลไว้ให้ (client แก้ SQL ไม่ได้)
 * ได้ผลลัพธ์เต็มก่อน แล้วตามด้วยทุกการเปลี่ยนแปลงที่ commit ลงฐานข้อมูล
 * ทำให้แก้งานจากอุปกรณ์เครื่องหนึ่งแล้วเครื่องอื่นเห็นทันที โดยไม่ต้อง refresh
 */

interface WorkRow {
  id: string
  owner_email: string
  subject_id: string
  title: string
  type: string
  status: string
  due_date: string
  note: string
  created_at: Date
}

interface SubjectRow {
  id: string
  name: string
  emoji: string
  academic_year: number
  semester: number
  created_at: Date
}

export interface LiveHandlers {
  onWorks: (works: Work[]) => void
  onSubjects: (subjects: Subject[]) => void
  onFailure: (message: string) => void
}

const RENEW_EARLY_MS = 10_000
const RETRY_MS = 1_000

const toWork = (row: WorkRow): Work => ({
  id: row.id,
  title: row.title,
  subjectId: row.subject_id,
  type: row.type as WorkType,
  status: row.status as WorkStatus,
  dueDate: row.due_date,
  note: row.note,
  createdAt: new Date(row.created_at).toISOString(),
  ownerEmail: row.owner_email,
})

const toSubject = (row: SubjectRow): Subject => ({
  id: row.id,
  name: row.name,
  emoji: row.emoji,
  academicYear: row.academic_year,
  semester: row.semester,
})

/** เริ่ม subscribe — คืนฟังก์ชันหยุด */
export async function startLiveSync(context: RequestContext, handlers: LiveHandlers): Promise<() => void> {
  const live = await api.live(context)
  if (!live.url) throw new Error('Realtime ยังไม่เปิดใช้งาน')

  const client = createRealtimeClient({ url: live.url })
  const stops: Array<() => void> = []

  function track<Row>(
    sealed: SealedLiveQuery<Row>,
    refresh: () => Promise<SealedLiveQuery<Row>>,
    onRows: (rows: Row[]) => void,
  ) {
    const subscription = client.subscribe(sealed)
    subscription.onChange((snapshot) => {
      if (snapshot.data) onRows([...snapshot.data])
    })
    subscription.onStateChange((state) => {
      if (state.status === 'error') handlers.onFailure(state.error.message)
    })

    // sealed query มีอายุสั้น — ต่ออายุก่อนหมด
    let timer: ReturnType<typeof setTimeout> | undefined
    let stopped = false
    const schedule = (expiresAt: number) => {
      if (stopped) return
      timer = setTimeout(renew, Math.max(0, expiresAt - Date.now() - RENEW_EARLY_MS))
    }
    const renew = async () => {
      try {
        const next = await refresh()
        schedule(next.expiresAt)
        await subscription.renew(next)
      } catch {
        if (!stopped) timer = setTimeout(renew, RETRY_MS)
      }
    }
    schedule(sealed.expiresAt)
    stops.push(() => {
      stopped = true
      clearTimeout(timer)
      subscription.unsubscribe()
    })
  }

  track<WorkRow>(
    live.works as SealedLiveQuery<WorkRow>,
    async () => (await api.live(context)).works as SealedLiveQuery<WorkRow>,
    (rows) =>
      handlers.onWorks(
        rows.map(toWork).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      ),
  )
  track<SubjectRow>(
    live.subjects as SealedLiveQuery<SubjectRow>,
    async () => (await api.live(context)).subjects as SealedLiveQuery<SubjectRow>,
    (rows) =>
      handlers.onSubjects(
        [...rows].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map(toSubject),
      ),
  )

  return () => {
    for (const stop of stops) stop()
    client.close()
  }
}
