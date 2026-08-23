interface LoginPageProps {
  onSignIn: () => void
}

/** หน้าเข้าสู่ระบบ — เหลือประโยคเดียว + ปุ่ม Google */
export function LoginPage({ onSignIn }: LoginPageProps) {
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

        <button
          type="button"
          onClick={onSignIn}
          className="flex min-h-[54px] w-full items-center justify-center gap-2.5 rounded-2xl border border-ink/15 bg-white text-sm font-bold text-ink shadow-[0_4px_0_rgba(42,38,34,.12)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_6px_0_rgba(42,38,34,.14)] active:translate-y-0.5 active:shadow-[0_1px_0_rgba(42,38,34,.14)] lg:text-[14.5px]"
        >
          <span
            aria-hidden="true"
            className="grid h-[22px] w-[22px] place-items-center rounded-full"
            style={{
              background:
                'conic-gradient(#ea4335 0 25%,#fbbc05 0 50%,#34a853 0 75%,#4285f4 0)',
            }}
          >
            <span className="h-[9px] w-[9px] rounded-full bg-white" />
          </span>
          Sign in with Google
        </button>
      </main>
    </div>
  )
}
