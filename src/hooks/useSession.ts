import { useCallback, useEffect, useRef, useState } from 'react'
import type { IssuedSession, RequestContext } from '../lib/api'
import { GOOGLE_CLIENT_ID } from '../lib/config'
import { forgetGoogleSession, initGoogleAuth, promptSignIn } from '../lib/googleAuth'

/**
 * เก็บเฉพาะ "session token ที่ backend ออกให้" ไม่ใช่ข้อมูลรับรองจาก Google
 *
 * ทำไมถึงเก็บใน localStorage: Apps Script อยู่คนละ origin กับหน้าเว็บ จึงตั้ง httpOnly cookie
 * ให้เราไม่ได้ · localStorage เป็นที่เดียวที่แชร์ข้ามแท็บได้จริง ซึ่งเป็นเงื่อนไขของข้อ
 * "เปิดแท็บใหม่แล้วต้องเข้าได้เลย" (sessionStorage แยกกันคนละแท็บ จึงใช้ไม่ได้)
 *
 * สิ่งที่เก็บคือ token สุ่มที่เพิกถอนได้และมีวันหมดอายุ ไม่ใช่รหัสผ่านและไม่ใช่ Google id_token
 * ตัว id_token ถูกใช้ครั้งเดียวตอนแลกเป็น session แล้วทิ้งทันที ไม่เคยถูกเขียนลงที่ไหน
 */
const SESSION_STORAGE_KEY = 'unitodo:session'

export type SessionStatus = 'checking' | 'signedOut' | 'signedIn'

export interface Session {
  status: SessionStatus
  /** ตัวตนที่จะแนบไปกับคำขอ — null คือยังไม่ได้ล็อกอิน */
  credential: RequestContext | null
  /** GIS โหลดเสร็จหรือยัง — ระหว่างรอหน้า Login จะโชว์ placeholder */
  isGoogleReady: boolean
  /** กำลังยืนยันตัวตนอยู่ — ใช้กันกดปุ่มซ้ำ */
  isAuthenticating: boolean
  authError: string | null
  /** เรียกเมื่อ backend ออก session ให้หลังล็อกอินสำเร็จ */
  acceptIssuedSession: (session: IssuedSession) => void
  /** เรียกเมื่อ bootstrap สำเร็จ — ยืนยันว่าตัวตนที่ถืออยู่ใช้ได้จริง */
  confirmSignedIn: () => void
  signOut: () => void
  /** session ใช้ไม่ได้แล้ว (หมดอายุ / ถูกเพิกถอน) — กลับไปหน้า Login */
  expireSession: (message?: string) => void
}

interface StoredSession {
  token: string
  expiresAt: string
}

function readStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return null

    const stored = JSON.parse(raw) as StoredSession
    if (!stored?.token) return null
    if (Date.parse(stored.expiresAt) <= Date.now()) {
      localStorage.removeItem(SESSION_STORAGE_KEY)
      return null
    }
    return stored
  } catch {
    return null
  }
}

function writeStoredSession(session: StoredSession | null) {
  try {
    if (session) localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
    else localStorage.removeItem(SESSION_STORAGE_KEY)
  } catch {
    // โหมดส่วนตัวบางเบราว์เซอร์เขียนไม่ได้ — ใช้ session ใน memory ต่อได้ในแท็บนี้
  }
}

/**
 * สถานะการเข้าสู่ระบบ
 *
 *   มี session เก่าอยู่ → status 'checking' ตั้งแต่เรนเดอร์แรก หน้า Login จึงไม่แวบขึ้นมาก่อน
 *   ไม่มี session      → status 'signedOut' แสดงหน้า Login ทันทีโดยไม่ต้องรอ
 *                        พร้อมกันนั้น GIS จะลองพากลับเข้าเองถ้าเคยล็อกอินไว้
 */
export function useSession(): Session {
  const [stored, setStored] = useState<StoredSession | null>(readStoredSession)
  const [googleIdToken, setGoogleIdToken] = useState<string | null>(null)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [isGoogleReady, setIsGoogleReady] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const hasSignedOut = useRef(false)

  /** Google ส่ง id_token กลับมา — ยังไม่ถือว่าเข้าระบบสำเร็จจนกว่า backend จะรับรอง */
  const acceptGoogleCredential = useCallback((idToken: string) => {
    if (hasSignedOut.current) return
    setAuthError(null)
    setGoogleIdToken(idToken)
  }, [])

  useEffect(() => {
    if (GOOGLE_CLIENT_ID === '') return

    let isActive = true
    initGoogleAuth(acceptGoogleCredential)
      .then(() => {
        if (!isActive) return
        setIsGoogleReady(true)
        // ไม่มี session เก่า แต่เคยล็อกอินไว้ → Google จะพากลับเข้าเองโดยไม่ต้องกดปุ่ม
        if (!readStoredSession()) promptSignIn()
      })
      .catch((error: Error) => {
        if (isActive) setAuthError(error.message)
      })

    return () => {
      isActive = false
    }
  }, [acceptGoogleCredential])

  const acceptIssuedSession = useCallback((session: IssuedSession) => {
    if (hasSignedOut.current) return
    const next = { token: session.token, expiresAt: session.expiresAt }
    writeStoredSession(next)
    setStored(next)
    // แลกเป็น session แล้ว ทิ้ง id_token ทันที ไม่เก็บไว้ที่ไหนทั้งนั้น
    setGoogleIdToken(null)
    setAuthError(null)
  }, [])

  const confirmSignedIn = useCallback(() => setIsConfirmed(true), [])

  const clearLocalSession = useCallback(() => {
    writeStoredSession(null)
    setStored(null)
    setGoogleIdToken(null)
    setIsConfirmed(false)
  }, [])

  const signOut = useCallback(() => {
    hasSignedOut.current = true
    // ปิด auto sign-in ไม่งั้นเปิดหน้าใหม่จะถูกพากลับเข้าทันที
    forgetGoogleSession()
    clearLocalSession()
    setAuthError(null)
    // เปิดทางให้กดล็อกอินใหม่ได้ทันทีในหน้าเดิม
    setTimeout(() => {
      hasSignedOut.current = false
    }, 0)
  }, [clearLocalSession])

  const expireSession = useCallback(
    (message?: string) => {
      clearLocalSession()
      setAuthError(message ?? null)
    },
    [clearLocalSession],
  )

  // ถือ session ที่ backend ออกให้เป็นหลัก · id_token ใช้เฉพาะคำขอแรกตอนล็อกอิน
  const credential: RequestContext | null = stored
    ? { sessionToken: stored.token }
    : googleIdToken
      ? { idToken: googleIdToken }
      : null

  const configError =
    GOOGLE_CLIENT_ID === '' ? 'ยังไม่ได้ตั้งค่า VITE_GOOGLE_CLIENT_ID ใน .env.local' : null

  return {
    status: !credential ? 'signedOut' : isConfirmed ? 'signedIn' : 'checking',
    credential,
    isGoogleReady,
    // กำลังแลก id_token กับ backend อยู่ — ปุ่มต้องกดซ้ำไม่ได้
    isAuthenticating: googleIdToken !== null && !isConfirmed,
    authError: configError ?? authError,
    acceptIssuedSession,
    confirmSignedIn,
    signOut,
    expireSession,
  }
}
