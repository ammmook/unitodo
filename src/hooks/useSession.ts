import { useCallback, useEffect, useRef, useState } from 'react'
import { GOOGLE_CLIENT_ID } from '../lib/config'
import {
  forgetGoogleSession,
  initGoogleAuth,
  isTokenUsable,
  promptSignIn,
  readTokenExpiry,
} from '../lib/googleAuth'

const TOKEN_STORAGE_KEY = 'unitodo:idToken'
/** ขอ token ใหม่ก่อนหมดอายุ 5 นาที ผู้ใช้จะไม่โดนเตะออกกลางคัน */
const REFRESH_MARGIN_MS = 5 * 60 * 1000

export type SessionStatus = 'signedOut' | 'signedIn'

export interface Session {
  status: SessionStatus
  idToken: string | null
  /** GIS โหลดเสร็จแล้วหรือยัง — ใช้ปิดปุ่มบนหน้า Login ระหว่างรอ */
  isGoogleReady: boolean
  authError: string | null
  signOut: () => void
}

function readStoredToken(): string | null {
  try {
    const stored = sessionStorage.getItem(TOKEN_STORAGE_KEY)
    return isTokenUsable(stored) ? stored : null
  } catch {
    return null
  }
}

/**
 * สถานะการล็อกอินด้วย Google
 *
 * เก็บ token ไว้ใน sessionStorage เพื่อให้ refresh แล้วเข้าแอปได้ทันทีโดยไม่ต้องรอ GIS
 * และตั้งเวลาต่ออายุ token ล่วงหน้าก่อนหมดอายุ
 */
export function useSession(): Session {
  const [idToken, setIdToken] = useState<string | null>(readStoredToken)
  const [isGoogleReady, setIsGoogleReady] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const isSignedOutManually = useRef(false)

  const acceptToken = useCallback((token: string) => {
    if (isSignedOutManually.current) return
    try {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token)
    } catch {
      // โหมดส่วนตัวบางเบราว์เซอร์เขียนไม่ได้ — ใช้ token ใน memory ต่อไปได้
    }
    setAuthError(null)
    setIdToken(token)
  }, [])

  useEffect(() => {
    if (GOOGLE_CLIENT_ID === '') return

    let isActive = true
    initGoogleAuth(acceptToken)
      .then(() => {
        if (!isActive) return
        setIsGoogleReady(true)
        // คนที่เคยล็อกอินไว้แล้วจะถูกพากลับเข้าแอปเองโดยไม่ต้องกดปุ่ม
        if (!readStoredToken()) promptSignIn()
      })
      .catch((error: Error) => {
        if (isActive) setAuthError(error.message)
      })

    return () => {
      isActive = false
    }
  }, [acceptToken])

  // ต่ออายุ token ล่วงหน้า — GIS จะยิง callback เดิมกลับมาพร้อม token ใหม่
  useEffect(() => {
    if (!idToken) return

    const expiresAt = readTokenExpiry(idToken)
    if (expiresAt === null) return

    const delay = Math.max(expiresAt - Date.now() - REFRESH_MARGIN_MS, 1000)
    const timeoutId = setTimeout(promptSignIn, delay)
    return () => clearTimeout(timeoutId)
  }, [idToken])

  const signOut = useCallback(() => {
    isSignedOutManually.current = true
    forgetGoogleSession()
    try {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY)
    } catch {
      // ไม่มีอะไรต้องทำ — state ใน memory ถูกล้างอยู่แล้ว
    }
    setIdToken(null)
    // เปิดทางให้กดล็อกอินใหม่ได้ทันทีในหน้าเดิม
    setTimeout(() => {
      isSignedOutManually.current = false
    }, 0)
  }, [])

  const configError = GOOGLE_CLIENT_ID === '' ? 'ยังไม่ได้ตั้งค่า VITE_GOOGLE_CLIENT_ID ใน .env.local' : null

  return {
    status: idToken ? 'signedIn' : 'signedOut',
    idToken,
    isGoogleReady,
    authError: configError ?? authError,
    signOut,
  }
}
