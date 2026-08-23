import { useEffect, useRef, useState } from 'react'
import { renderGoogleButton } from '../lib/googleAuth'

interface LoginPageProps {
  /** GIS โหลดเสร็จหรือยัง — ระหว่างรอจะโชว์ placeholder แทนปุ่ม */
  isGoogleReady: boolean
  authError: string | null
}

/** ปุ่มของ Google รับความกว้างเป็นตัวเลข และมีขอบเขตในตัว */
const MIN_BUTTON_WIDTH = 200
const MAX_BUTTON_WIDTH = 400

/** ถ้าปุ่มยังไม่ขึ้นภายในเวลานี้ ถือว่า Google ปฏิเสธ (มักเป็นเพราะ origin ไม่ได้รับอนุญาต) */
const BUTTON_TIMEOUT_MS = 3000
const BUTTON_POLL_MS = 150

type ButtonState = 'loading' | 'ready' | 'blocked'

/** หน้าเข้าสู่ระบบ — ต้องล็อกอิน Google ก่อนถึงจะเข้าแอปได้ */
export function LoginPage({ isGoogleReady, authError }: LoginPageProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const buttonHostRef = useRef<HTMLDivElement>(null)
  const [buttonState, setButtonState] = useState<ButtonState>('loading')

  useEffect(() => {
    const wrapper = wrapperRef.current
    const host = buttonHostRef.current
    if (!isGoogleReady || !wrapper || !host) return

    // วัดจากกล่องนอกเสมอ ไม่ใช่จากตัว host — ไม่งั้นการวาดปุ่มจะไปเปลี่ยนขนาดที่วัด
    // แล้ววนวาดซ้ำจนปุ่มซ้อนกัน
    let lastWidth = 0
    const draw = () => {
      const width = Math.round(wrapper.getBoundingClientRect().width)
      if (width === 0 || Math.abs(width - lastWidth) < 2) return
      lastWidth = width
      renderGoogleButton(host, Math.min(Math.max(width, MIN_BUTTON_WIDTH), MAX_BUTTON_WIDTH))
    }

    draw()
    window.addEventListener('resize', draw)

    // ปุ่มของ Google อยู่ใน iframe จึงไม่มี event บอกว่าวาดสำเร็จ — เช็คจากความสูงจริงแทน
    const startedAt = Date.now()
    const pollId = setInterval(() => {
      if (host.getBoundingClientRect().height > 10) {
        setButtonState('ready')
        clearInterval(pollId)
      } else if (Date.now() - startedAt > BUTTON_TIMEOUT_MS) {
        setButtonState('blocked')
        clearInterval(pollId)
      }
    }, BUTTON_POLL_MS)

    return () => {
      window.removeEventListener('resize', draw)
      clearInterval(pollId)
    }
  }, [isGoogleReady])

  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-ink p-5">
      <span
        aria-hidden="true"
        className="absolute -top-40 -right-28 h-[420px] w-[420px] rounded-full bg-highlight/15 lg:h-[520px] lg:w-[520px]"
      />
      <span
        aria-hidden="true"
        className="absolute -bottom-32 -left-24 h-[300px] w-[300px] rounded-full bg-progress/20 lg:h-[340px] lg:w-[340px]"
      />

      <main className="animate-rise relative w-full max-w-[400px] rounded-[26px] bg-cream px-6 py-9 text-center text-ink shadow-[0_40px_70px_-40px_#000] lg:rounded-[28px] lg:px-9 lg:py-10">
        <span
          aria-hidden="true"
          className="mx-auto mb-4 grid h-[50px] w-[50px] place-items-center rounded-[17px] bg-highlight text-[21px] font-extrabold lg:h-13 lg:w-13 lg:rounded-[18px] lg:text-[22px]"
        >
          T
        </span>
        <h1 className="text-[26px] font-extrabold -tracking-[0.8px] lg:text-[29px] lg:-tracking-[0.9px]">
          Todolist
        </h1>
        <p className="mt-2.5 mb-6 text-[13.5px] text-pretty text-ink/75 lg:text-[14.5px]">
          มาลองจัดสรรเวลาเรียนของเรากันเถอะ
        </p>

        {/* ปุ่มจริงของ Google อยู่ข้างใน — กรอบนอกทำให้เข้ากับสไตล์ปุ่มอื่นในแอป
            host สูง 0 ตอนยังไม่มีปุ่ม จึงไม่มีทางซ้อนกับ placeholder */}
        <div
          ref={wrapperRef}
          className="overflow-hidden rounded-2xl border border-ink/15 bg-white shadow-[0_4px_0_rgba(42,38,34,.12)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_6px_0_rgba(42,38,34,.14)] active:translate-y-0.5 active:shadow-[0_1px_0_rgba(42,38,34,.14)]"
        >
          <div ref={buttonHostRef} className="[&>div]:!w-full" />

          {buttonState === 'loading' && (
            <p className="flex min-h-[46px] items-center justify-center gap-2 text-[13px] font-semibold text-ink/60">
              <span
                aria-hidden="true"
                className="h-3.5 w-3.5 animate-spin rounded-full border-[2.5px] border-ink/15 border-t-ink/60"
              />
              กำลังเตรียมการเข้าสู่ระบบ…
            </p>
          )}

          {buttonState === 'blocked' && (
            <p className="flex min-h-[46px] items-center justify-center px-3 text-[13px] font-semibold text-overdue-ink-strong">
              Google ปฏิเสธการแสดงปุ่ม
            </p>
          )}
        </div>

        {authError && (
          <p
            role="alert"
            className="mt-4 rounded-[14px] bg-overdue-soft px-3.5 py-3 text-left text-[12.5px] font-semibold text-overdue-ink-strong"
          >
            {authError}
          </p>
        )}

        {buttonState === 'blocked' ? <OriginHelp /> : (
          <p className="mt-5 text-[11.5px] text-ink/60">
            ข้อมูลงานของแต่ละคนแยกกันตามบัญชี Google ที่ใช้เข้าสู่ระบบ
          </p>
        )}
      </main>
    </div>
  )
}

/**
 * "The given origin is not allowed for the given client ID" แก้ในโค้ดไม่ได้
 * ต้องไปเพิ่ม origin ปัจจุบันใน Google Cloud Console — โชว์ค่าที่ต้องก๊อปให้เลย
 */
function OriginHelp() {
  const origin = typeof window === 'undefined' ? '' : window.location.origin

  return (
    <div className="mt-4 rounded-[14px] border border-ink/15 bg-sand px-3.5 py-3 text-left text-[11.5px] text-ink/80">
      <p className="mb-2 font-bold text-ink">ต้องอนุญาต origin นี้ก่อน</p>
      <p className="mb-2">
        เปิด Google Cloud Console → APIs &amp; Services → Credentials → เลือก OAuth client ที่ใช้อยู่ →
        เพิ่มค่าข้างล่างนี้ใน <strong>Authorized JavaScript origins</strong> แล้วกด Save
        (รออัปเดตสักครู่แล้วรีเฟรชหน้านี้)
      </p>
      <code className="block rounded-[9px] border border-ink/15 bg-white px-2.5 py-2 font-mono text-[12px] break-all text-ink select-all">
        {origin}
      </code>
    </div>
  )
}
