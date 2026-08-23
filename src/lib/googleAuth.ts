import { GOOGLE_CLIENT_ID } from './config'

/**
 * ห่อ Google Identity Services (GIS) ไว้ที่เดียว
 *
 * ได้ ID token (JWT) กลับมาแล้วส่งให้ backend ตรวจกับ Google อีกที
 * frontend ไม่เคยตัดสินเองว่าใครเป็นใคร — แค่ถือ token ไว้ส่งต่อ
 */

interface CredentialResponse {
  credential: string
}

interface GoogleAccountsId {
  initialize: (config: {
    client_id: string
    callback: (response: CredentialResponse) => void
    auto_select?: boolean
    cancel_on_tap_outside?: boolean
    use_fedcm_for_prompt?: boolean
  }) => void
  prompt: () => void
  renderButton: (
    parent: HTMLElement,
    options: {
      type?: 'standard' | 'icon'
      theme?: 'outline' | 'filled_blue' | 'filled_black'
      size?: 'small' | 'medium' | 'large'
      text?: 'signin_with' | 'signup_with' | 'continue_with'
      shape?: 'rectangular' | 'pill' | 'circle' | 'square'
      logo_alignment?: 'left' | 'center'
      width?: number
    },
  ) => void
  disableAutoSelect: () => void
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleAccountsId } }
  }
}

const GIS_SRC = 'https://accounts.google.com/gsi/client'

let loadPromise: Promise<GoogleAccountsId> | null = null
let isInitialized = false

/** โหลดสคริปต์ GIS ครั้งเดียว แล้วแชร์ promise เดิมให้ทุกคนที่เรียกซ้ำ */
export function loadGoogleIdentity(): Promise<GoogleAccountsId> {
  if (loadPromise) return loadPromise

  loadPromise = new Promise<GoogleAccountsId>((resolve, reject) => {
    const existing = window.google?.accounts?.id
    if (existing) {
      resolve(existing)
      return
    }

    const script = document.createElement('script')
    script.src = GIS_SRC
    script.async = true
    script.defer = true
    script.onload = () => {
      const accountsId = window.google?.accounts?.id
      if (accountsId) resolve(accountsId)
      else reject(new Error('โหลด Google Identity Services ไม่สำเร็จ'))
    }
    script.onerror = () => reject(new Error('โหลด Google Identity Services ไม่สำเร็จ'))
    document.head.appendChild(script)
  })

  return loadPromise
}

/**
 * เตรียม GIS ให้พร้อมใช้ · onCredential จะถูกเรียกทั้งตอนกดปุ่มและตอน auto sign-in
 * auto_select ทำให้คนที่เคยล็อกอินแล้วกลับเข้าเว็บได้เลยโดยไม่ต้องกดซ้ำ
 */
export async function initGoogleAuth(
  onCredential: (idToken: string) => void,
): Promise<GoogleAccountsId> {
  const accountsId = await loadGoogleIdentity()

  if (!isInitialized) {
    accountsId.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => onCredential(response.credential),
      auto_select: true,
      cancel_on_tap_outside: false,
      use_fedcm_for_prompt: true,
    })
    isInitialized = true
  }

  return accountsId
}

/** วาดปุ่มจริงของ Google ลงใน container — เราซ้อนปุ่มตามดีไซน์ทับไว้ด้านบน */
export function renderGoogleButton(container: HTMLElement, width: number) {
  const accountsId = window.google?.accounts?.id
  if (!accountsId) return

  container.innerHTML = ''
  accountsId.renderButton(container, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text: 'signin_with',
    shape: 'rectangular',
    logo_alignment: 'center',
    width,
  })
}

/** ขอ token ใหม่แบบเงียบ ๆ สำหรับคนที่เคยล็อกอินไว้แล้ว */
export function promptSignIn() {
  window.google?.accounts?.id?.prompt()
}

/** ออกจากระบบ — ปิด auto sign-in ไม่งั้นครั้งหน้าจะเด้งกลับเข้าทันที */
export function forgetGoogleSession() {
  window.google?.accounts?.id?.disableAutoSelect()
}

/** อ่าน exp จาก JWT เพื่อรู้ว่า token หมดอายุหรือยัง โดยไม่ต้องยิงเน็ต */
export function readTokenExpiry(idToken: string): number | null {
  try {
    const payload = idToken.split('.')[1]
    if (!payload) return null
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const exp = Number(JSON.parse(json).exp)
    return Number.isFinite(exp) ? exp * 1000 : null
  } catch {
    return null
  }
}

/** เหลืออายุน้อยกว่า 2 นาที ถือว่าใช้ไม่ได้แล้ว — เผื่อเวลาเดินทางของคำขอ */
export function isTokenUsable(idToken: string | null): idToken is string {
  if (!idToken) return false
  const expiresAt = readTokenExpiry(idToken)
  return expiresAt === null || expiresAt - Date.now() > 120_000
}
