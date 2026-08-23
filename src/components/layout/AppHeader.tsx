import type { AcademicTerm, AppUser, PageName } from '../../types/todolist'
import { BrandMark, TermSelector } from './AppIdentity'
import { UserMenu } from './UserMenu'
import { PAGE_TABS } from './navigationTabs'

interface AppHeaderProps {
  currentPage: PageName
  onNavigate: (page: PageName) => void
  term: AcademicTerm
  onTermChange: (term: AcademicTerm) => void
  user: AppUser
  onSignOut: () => void
}

/** แถบนำทางบนสุดของ desktop — mobile ใช้ MobileTabBar แทน */
export function AppHeader({
  currentPage,
  onNavigate,
  term,
  onTermChange,
  user,
  onSignOut,
}: AppHeaderProps) {
  return (
    <div className="hidden items-center justify-between gap-4 bg-ink px-8 py-4 text-cream lg:flex">
      <div className="flex items-center gap-[18px]">
        <BrandMark />
        <nav aria-label="เมนูหลัก" className="flex gap-1 rounded-2xl bg-cream/10 p-[5px]">
          {PAGE_TABS.map((tab) => {
            const isCurrent = tab.page === currentPage
            return (
              <button
                key={tab.page}
                type="button"
                aria-current={isCurrent ? 'page' : undefined}
                title={tab.description}
                onClick={() => onNavigate(tab.page)}
                className={`rounded-[10px] px-4 py-2.5 text-[13px] transition-colors ${
                  isCurrent
                    ? 'bg-cream font-bold text-ink'
                    : 'font-medium text-cream hover:bg-cream/15'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <TermSelector term={term} onTermChange={onTermChange} tone="onDark" />
        <UserMenu user={user} onSignOut={onSignOut} />
      </div>
    </div>
  )
}
