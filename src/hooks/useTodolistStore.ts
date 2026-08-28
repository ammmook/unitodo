import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ApiError,
  api,
  type BootstrapPayload,
  type IssuedSession,
  type RequestContext,
} from '../lib/api'
import type { AppUser, NewSubjectDraft, NewWorkDraft, Subject, Work } from '../types/todolist'

/** ใช้เมื่อผู้ใช้ไม่ได้กรอกอีโมจิเอง */
const DEFAULT_SUBJECT_EMOJI = '📘'

/** cache ของรอบก่อน เอาไว้วาดหน้าจอทันทีระหว่างรอข้อมูลใหม่ */
const CACHE_PREFIX = 'unitodo:snapshot:'

export interface TodolistStore {
  me: AppUser | null
  viewingAs: AppUser | null
  users: AppUser[]
  subjects: Subject[]
  works: Work[]
  /** ยังไม่มีข้อมูลอะไรให้แสดงเลย — ใช้ตัดสินว่าจะโชว์ skeleton ไหม */
  isLoading: boolean
  loadError: string | null
  refresh: () => void
  addWork: (draft: NewWorkDraft, ownerEmail: string) => Work
  updateWork: (id: string, changes: Partial<Work>) => void
  deleteWork: (id: string) => void
  restoreWork: (work: Work) => void
  addSubject: (draft: NewSubjectDraft) => Subject
}

interface StoreOptions {
  /** ตัวตนที่จะแนบไปกับคำขอ — session token ปกติ หรือ id_token ตอนล็อกอินครั้งแรก */
  credential: RequestContext | null
  /** อีเมลที่ admin กำลังสวมบทอยู่ — null คือดูข้อมูลตัวเอง */
  viewAs: string | null
  onError: (message: string) => void
  onUnauthenticated: (message?: string) => void
  /** backend ออก session ให้หลังล็อกอินสำเร็จ */
  onSessionIssued: (session: IssuedSession) => void
  /** bootstrap ผ่านแล้ว — ตัวตนที่ถืออยู่ใช้ได้จริง */
  onAuthenticated: () => void
}

function cacheKey(viewAs: string | null) {
  return CACHE_PREFIX + (viewAs ?? 'self')
}

function readCache(viewAs: string | null): BootstrapPayload | null {
  try {
    const raw = localStorage.getItem(cacheKey(viewAs))
    return raw ? (JSON.parse(raw) as BootstrapPayload) : null
  } catch {
    return null
  }
}

function writeCache(viewAs: string | null, payload: BootstrapPayload) {
  try {
    localStorage.setItem(cacheKey(viewAs), JSON.stringify(payload))
  } catch {
    // เต็มหรือเขียนไม่ได้ก็ข้ามไป cache เป็นแค่ของแถม
  }
}

export function clearSnapshotCache() {
  try {
    const keys = Object.keys(localStorage).filter((key) => key.startsWith(CACHE_PREFIX))
    for (const key of keys) localStorage.removeItem(key)
  } catch {
    // ไม่มีอะไรต้องทำ
  }
}

function newId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * ข้อมูลทั้งหมดของแอป — โหลดจาก Google Sheet ผ่าน Apps Script
 *
 * แนวทางเรื่องความเร็ว
 *   - เปิดแอปยิง bootstrap แค่คำขอเดียว ได้ทุกอย่างครบ
 *   - วาดจาก cache ก่อนแล้วค่อยอัปเดตทับเมื่อของจริงมาถึง (stale-while-revalidate)
 *   - ทุกการแก้ไขอัปเดตหน้าจอทันที แล้วค่อยส่งขึ้นเซิร์ฟเวอร์เบื้องหลัง
 *     ถ้าเซิร์ฟเวอร์ปฏิเสธจึงย้อนกลับคืนพร้อมแจ้งเตือน — ข้อมูลบนจอไม่หลุดจากของจริง
 */
export function useTodolistStore({
  credential,
  viewAs,
  onError,
  onUnauthenticated,
  onSessionIssued,
  onAuthenticated,
}: StoreOptions): TodolistStore {
  // ยิง bootstrap ใหม่เมื่อ "ตัวตน" เปลี่ยนจริง ๆ ไม่ใช่ทุกครั้งที่ object ถูกสร้างใหม่
  const credentialKey = credential
    ? `${credential.sessionToken ?? ''}|${credential.idToken ?? ''}`
    : ''

  const [snapshot, setSnapshot] = useState<BootstrapPayload | null>(() =>
    credentialKey ? readCache(viewAs) : null,
  )
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadCount, setReloadCount] = useState(0)

  // สลับบัญชีที่กำลังดูอยู่ → เปลี่ยนไปใช้ cache ของคนนั้นทันทีระหว่างเรนเดอร์
  // ไม่ให้ข้อมูลของคนเก่าค้างบนจอแม้แค่เฟรมเดียว
  const identityKey = `${credentialKey ? 'in' : 'out'}:${viewAs ?? 'self'}`
  const [lastIdentityKey, setLastIdentityKey] = useState(identityKey)
  if (lastIdentityKey !== identityKey) {
    setLastIdentityKey(identityKey)
    setSnapshot(credentialKey ? readCache(viewAs) : null)
    setLoadError(null)
  }

  // callback/context ล่าสุด เก็บไว้ใน ref เพื่อไม่ให้ effect โหลดข้อมูลซ้ำโดยไม่จำเป็น
  const handlersRef = useRef({ onError, onUnauthenticated, onSessionIssued, onAuthenticated })
  const contextRef = useRef<RequestContext>({ ...credential, viewAs })
  useEffect(() => {
    handlersRef.current = { onError, onUnauthenticated, onSessionIssued, onAuthenticated }
    contextRef.current = { ...credential, viewAs }
  })

  useEffect(() => {
    if (!credentialKey) return

    const controller = new AbortController()

    api
      .bootstrap(contextRef.current, controller.signal)
      .then((payload) => {
        if (controller.signal.aborted) return

        // เพิ่งล็อกอินด้วย Google → เก็บ session ที่ backend ออกให้ แล้วทิ้ง id_token
        if (payload.session) handlersRef.current.onSessionIssued(payload.session)
        handlersRef.current.onAuthenticated()

        setSnapshot(payload)
        setLoadError(null)
        writeCache(viewAs, payload)
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        if (error instanceof ApiError && error.code === 'UNAUTHENTICATED') {
          handlersRef.current.onUnauthenticated(error.message)
          return
        }
        setLoadError(error instanceof Error ? error.message : 'โหลดข้อมูลไม่สำเร็จ')
      })

    return () => controller.abort()
  }, [credentialKey, viewAs, reloadCount])

  const refresh = useCallback(() => setReloadCount((count) => count + 1), [])

  /** อัปเดตจอไปก่อน · ถ้าเซิร์ฟเวอร์ไม่รับ ค่อยย้อนคืนแล้วบอกผู้ใช้ */
  const commit = useCallback((request: Promise<unknown>, rollback: () => void) => {
    request
      .then(() => {
        // ให้ cache ตามทันของที่เพิ่งบันทึกสำเร็จ
        setSnapshot((current) => {
          if (current) writeCache(contextRef.current.viewAs ?? null, current)
          return current
        })
      })
      .catch((error: unknown) => {
        rollback()
        if (error instanceof ApiError && error.code === 'UNAUTHENTICATED') {
          handlersRef.current.onUnauthenticated(error.message)
          return
        }
        handlersRef.current.onError(
          error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง',
        )
      })
  }, [])

  const addWork = useCallback(
    (draft: NewWorkDraft, ownerEmail: string): Work => {
      const work: Work = {
        id: newId(),
        title: draft.title.trim(),
        subjectId: draft.subjectId,
        type: draft.type === '' ? 'other' : draft.type,
        status: 'notStarted',
        dueDate: draft.dueDate,
        note: draft.note.trim(),
        createdAt: new Date().toISOString(),
        ownerEmail,
      }

      setSnapshot((current) => (current ? { ...current, works: [work, ...current.works] } : current))
      commit(api.addWork(work, contextRef.current), () =>
        setSnapshot((current) =>
          current
            ? { ...current, works: current.works.filter((item) => item.id !== work.id) }
            : current,
        ),
      )
      return work
    },
    [commit],
  )

  const updateWork = useCallback(
    (id: string, changes: Partial<Work>) => {
      let previous: Work | undefined

      setSnapshot((current) => {
        if (!current) return current
        return {
          ...current,
          works: current.works.map((work) => {
            if (work.id !== id) return work
            previous = work
            return { ...work, ...changes }
          }),
        }
      })

      commit(api.updateWork(id, changes, contextRef.current), () =>
        setSnapshot((current) =>
          current && previous
            ? { ...current, works: current.works.map((work) => (work.id === id ? previous! : work)) }
            : current,
        ),
      )
    },
    [commit],
  )

  const deleteWork = useCallback(
    (id: string) => {
      let removed: Work | undefined

      setSnapshot((current) => {
        if (!current) return current
        removed = current.works.find((work) => work.id === id)
        return { ...current, works: current.works.filter((work) => work.id !== id) }
      })

      commit(api.deleteWork(id, contextRef.current), () =>
        setSnapshot((current) =>
          current && removed ? { ...current, works: [removed, ...current.works] } : current,
        ),
      )
    },
    [commit],
  )

  const restoreWork = useCallback(
    (work: Work) => {
      setSnapshot((current) => (current ? { ...current, works: [work, ...current.works] } : current))
      commit(api.restoreWork(work, contextRef.current), () =>
        setSnapshot((current) =>
          current
            ? { ...current, works: current.works.filter((item) => item.id !== work.id) }
            : current,
        ),
      )
    },
    [commit],
  )

  const addSubject = useCallback(
    (draft: NewSubjectDraft): Subject => {
      const subject: Subject = {
        id: newId(),
        name: draft.name.trim(),
        emoji: draft.emoji.trim() || DEFAULT_SUBJECT_EMOJI,
        academicYear: draft.academicYear,
        semester: draft.semester,
      }

      setSnapshot((current) =>
        current ? { ...current, subjects: [...current.subjects, subject] } : current,
      )
      commit(api.addSubject(subject, contextRef.current), () =>
        setSnapshot((current) =>
          current
            ? { ...current, subjects: current.subjects.filter((item) => item.id !== subject.id) }
            : current,
        ),
      )
      return subject
    },
    [commit],
  )

  return {
    me: snapshot?.me ?? null,
    viewingAs: snapshot?.viewingAs ?? null,
    users: snapshot?.users ?? [],
    subjects: snapshot?.subjects ?? [],
    works: snapshot?.works ?? [],
    isLoading: snapshot === null && loadError === null,
    loadError,
    refresh,
    addWork,
    updateWork,
    deleteWork,
    restoreWork,
    addSubject,
  }
}
