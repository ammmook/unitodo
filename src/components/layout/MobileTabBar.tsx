import type { PageName } from '../../types/todolist'
import { PAGE_TABS } from './navigationTabs'

interface MobileTabBarProps {
  currentPage: PageName
  onNavigate: (page: PageName) => void
}

/** แถบเมนูล่างของมือถือ — แตะง่าย พื้นที่กดสูง 56px */
export function MobileTabBar({ currentPage, onNavigate }: MobileTabBarProps) {
  return (
    <nav
      aria-label="เมนูหลัก"
      className="sticky bottom-0 z-30 grid grid-cols-3 gap-1 border-t border-ink/10 bg-white px-3 pt-2.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] lg:hidden"
    >
      {PAGE_TABS.map((tab) => {
        const isCurrent = tab.page === currentPage
        return (
          <button
            key={tab.page}
            type="button"
            aria-current={isCurrent ? 'page' : undefined}
            title={tab.description}
            onClick={() => onNavigate(tab.page)}
            className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-[14px] text-[10.5px] transition-colors ${
              isCurrent ? 'bg-highlight-soft font-bold text-ink' : 'font-semibold text-ink/75'
            }`}
          >
            <img
              src={tab.iconSrc}
              alt=""
              width={22}
              height={22}
              className={`h-[22px] w-[22px] transition-opacity ${
                isCurrent ? 'opacity-100' : 'opacity-55'
              }`}
            />
            {tab.label}
            <span className="sr-only">— {tab.description}</span>
          </button>
        )
      })}
    </nav>
  )
}
