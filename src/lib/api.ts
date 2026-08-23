import type { AppUser, Subject, Work, WorkStatus, WorkType } from '../types/todolist'
import { API_URL } from './config'

/**
 * Client คุยกับ Google Apps Script Web App
 *
 * ส่งด้วย POST + Content-Type: text/plain เพื่อไม่ให้เบราว์เซอร์ยิง preflight (OPTIONS)
 * ซึ่ง Apps Script ตอบไม่ได้ — ประหยัดไปหนึ่ง round-trip ต่อทุกคำขอ
 */

/** session ที่ backend ออกให้ — มีเฉพาะตอนที่เพิ่งแลกมาจาก Google id_token */
export interface IssuedSession {
  token: string
  /** ISO datetime */
  expiresAt: string
}

export interface BootstrapPayload {
  /** บัญชีที่ล็อกอินจริง */
  me: AppUser
  /** บัญชีที่กำลังดูข้อมูลอยู่ — เท่ากับ me ถ้าไม่ได้สวมบทใคร */
  viewingAs: AppUser
  /** ส่งมาเฉพาะตอนที่ me.isAdmin */
  users?: AppUser[]
  subjects: Subject[]
  works: Work[]
  serverTime: string
  session?: IssuedSession
}

export type ApiErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'VALIDATION'
  | 'DUPLICATE'
  | 'NOT_FOUND'
  | 'BUSY'
  | 'NETWORK'
  | 'SERVER_ERROR'
  | 'UNKNOWN_ACTION'
  | 'BAD_REQUEST'
  | 'NOT_CONFIGURED'

export class ApiError extends Error {
  code: ApiErrorCode

  constructor(code: ApiErrorCode, message: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

interface ApiEnvelope<T> {
  ok: boolean
  data?: T
  error?: ApiErrorCode
  message?: string
}

/**
 * ตัวตนที่แนบไปกับคำขอ — ปกติใช้ sessionToken
 * ส่วน idToken ใช้เฉพาะคำขอแรกตอนล็อกอิน เพื่อแลกเป็น session แล้วทิ้งไป
 */
export interface RequestContext {
  sessionToken?: string | null
  idToken?: string | null
  /** อีเมลของคนที่ admin กำลังสวมบทอยู่ */
  viewAs?: string | null
}

async function call<T>(
  action: string,
  params: Record<string, unknown>,
  context: RequestContext,
  signal?: AbortSignal,
): Promise<T> {
  if (API_URL === '') {
    throw new ApiError('NOT_CONFIGURED', 'ยังไม่ได้ตั้งค่า VITE_GOOGLE_SHEET_API_URL ใน .env.local')
  }

  let response: Response
  try {
    response = await fetch(API_URL, {
      method: 'POST',
      // text/plain = simple request → ไม่มี preflight
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        ...params,
        action,
        sessionToken: context.sessionToken ?? '',
        idToken: context.idToken ?? '',
        viewAs: context.viewAs ?? '',
      }),
      redirect: 'follow',
      signal,
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new ApiError('NETWORK', 'ต่อเน็ตไม่ได้ ลองเช็คสัญญาณแล้วลองใหม่')
  }

  if (!response.ok) {
    throw new ApiError('SERVER_ERROR', `เซิร์ฟเวอร์ตอบกลับ ${response.status}`)
  }

  let envelope: ApiEnvelope<T>
  try {
    envelope = (await response.json()) as ApiEnvelope<T>
  } catch {
    // Apps Script ที่ยังไม่ deploy หรือไม่ได้ตั้ง "Anyone" จะคืน HTML หน้า login มาแทน JSON
    throw new ApiError('SERVER_ERROR', 'ตอบกลับมาไม่ใช่ JSON — เช็คการ deploy ของ Apps Script')
  }

  if (!envelope.ok) {
    // เวอร์ชันเก่าของ Apps Script ตอบ { error: "ข้อความ" } เฉย ๆ ไม่มี code แยก
    const message = envelope.message ?? envelope.error ?? 'บันทึกไม่สำเร็จ'
    throw new ApiError(envelope.error ?? 'SERVER_ERROR', message)
  }

  return envelope.data as T
}

export const api = {
  /** ดึงทุกอย่างที่แอปต้องใช้ในคำขอเดียว */
  bootstrap: (context: RequestContext, signal?: AbortSignal) =>
    call<BootstrapPayload>('bootstrap', {}, context, signal),

  addSubject: (subject: Subject, context: RequestContext) =>
    call<Subject>('addSubject', { ...subject }, context),

  deleteSubject: (id: string, context: RequestContext) =>
    call<{ id: string; deletedWorkIds: string[] }>('deleteSubject', { id }, context),

  addWork: (work: Work, context: RequestContext) => call<Work>('addWork', { ...work }, context),

  /** undo หลังลบ — backend รับ id เดิมได้ ยิงซ้ำก็ไม่สร้างข้อมูลซ้ำ */
  restoreWork: (work: Work, context: RequestContext) =>
    call<Work>('restoreWork', { ...work }, context),

  updateWork: (
    id: string,
    changes: Partial<{
      title: string
      subjectId: string
      type: WorkType
      status: WorkStatus
      dueDate: string
      note: string
    }>,
    context: RequestContext,
  ) => call<{ id: string }>('updateWork', { id, ...changes }, context),

  deleteWork: (id: string, context: RequestContext) =>
    call<{ id: string }>('deleteWork', { id }, context),

  setAdmin: (email: string, isAdmin: boolean, context: RequestContext) =>
    call<{ email: string; isAdmin: boolean }>('setAdmin', { email, isAdmin }, context),

  /** ยกเลิก session ฝั่งเซิร์ฟเวอร์ — token เดิมใช้ไม่ได้อีกแม้จะยังค้างอยู่ที่ไหน */
  logout: (context: RequestContext) => call<{ signedOut: boolean }>('logout', {}, context),
}
