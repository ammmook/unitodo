import type { AppUser } from '../../types/todolist'
import { formatDueDate } from '../../utils/workFormatting'

const ROLE_BADGE =
  'inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[10.5px] font-bold'

const AVATAR_TONES = ['bg-highlight-soft', 'bg-progress-soft', 'bg-done-soft', 'bg-sand']

/** รายชื่อผู้ใช้ทั้งหมด — เห็นเฉพาะบัญชีที่ isAdmin */
export function AdminUserList({ users }: { users: AppUser[] }) {
  return (
    <section aria-labelledby="admin-users-heading" className="lg:rounded-[22px] lg:border lg:border-ink/10 lg:bg-white lg:px-6 lg:py-5.5">
      <div className="mb-1 flex items-center gap-2">
        <h2 id="admin-users-heading" className="text-sm font-bold lg:text-[15px]">
          Admin · ผู้ใช้ทั้งหมด
        </h2>
        <span className="rounded-full bg-ink px-2.5 py-1 text-[10px] font-bold whitespace-nowrap text-highlight">
          เห็นเฉพาะ isAdmin
        </span>
      </div>
      <p className="mb-3.5 text-[11.5px] text-ink/75 lg:text-xs">{users.length} users</p>

      {/* desktop: ตารางเทียบข้อมูลได้ครบ */}
      <table className="hidden w-full border-collapse text-[13px] lg:table">
        <thead>
          <tr className="text-left text-[11px] tracking-[0.06em] text-ink/75">
            <th scope="col" className="px-2 pb-2.5 font-bold">
              อีเมล
            </th>
            <th scope="col" className="px-2 pb-2.5 font-bold">
              สิทธิ์
            </th>
            <th scope="col" className="px-2 pb-2.5 font-bold">
              สมัครเมื่อ
            </th>
            <th scope="col" className="px-2 pb-2.5 font-bold">
              เข้าล่าสุด
            </th>
            <th scope="col" className="px-2 pb-2.5 text-right font-bold">
              ดูข้อมูล
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-t border-ink/10 transition-colors hover:bg-cream">
              <td className="px-2 py-3 font-semibold break-all">{user.email}</td>
              <td className="px-2 py-3">
                <RoleBadge isAdmin={user.isAdmin} />
              </td>
              <td className="px-2 py-3 text-ink/75">{formatDueDate(user.signedUpAt)}</td>
              <td className="px-2 py-3 text-ink/75">{formatDueDate(user.lastSignInAt)}</td>
              <td className="px-2 py-3 text-right">
                <ViewUserButton user={user} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* mobile: การ์ดเรียงตั้ง อ่านง่ายกว่าตารางเลื่อนแนวนอน */}
      <ul className="flex flex-col gap-2 lg:hidden">
        {users.map((user, index) => (
          <li
            key={user.id}
            className="flex items-center gap-2.5 rounded-2xl border border-ink/10 bg-white p-3"
          >
            <span
              aria-hidden="true"
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold ${
                AVATAR_TONES[index % AVATAR_TONES.length]
              }`}
            >
              {user.displayName.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-bold break-all">{user.email}</p>
              <p className="text-[11px] text-ink/75">
                เข้าล่าสุด {formatDueDate(user.lastSignInAt)}
              </p>
              <RoleBadge isAdmin={user.isAdmin} className="mt-1.5" />
            </div>
            <ViewUserButton user={user} />
          </li>
        ))}
      </ul>
    </section>
  )
}

/** ปุ่มดูข้อมูลผู้ใช้ — มือถือเป็นปุ่มไอคอนพื้นที่กด 44px · desktop มีข้อความกำกับ */
function ViewUserButton({ user }: { user: AppUser }) {
  return (
    <button
      type="button"
      aria-label={`ดูข้อมูลของ ${user.email}`}
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-ink/15 bg-cream text-sm font-bold text-ink transition-[background-color,transform] hover:bg-sand active:scale-95 lg:h-9 lg:w-auto lg:px-3 lg:text-xs"
    >
      <span aria-hidden="true">👁</span>
      <span className="hidden lg:inline">ดู</span>
    </button>
  )
}

function RoleBadge({ isAdmin, className = '' }: { isAdmin: boolean; className?: string }) {
  return isAdmin ? (
    <span className={`${ROLE_BADGE} bg-highlight-soft text-highlight-ink ${className}`}>
      ★ Admin
    </span>
  ) : (
    <span className={`${ROLE_BADGE} bg-sand text-ink/80 ${className}`}>User</span>
  )
}
