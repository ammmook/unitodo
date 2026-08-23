import type { PageName } from '../../types/todolist'

/** เมนูหลัก ใช้ร่วมกันทั้ง AppHeader (desktop) และ MobileTabBar */
export const PAGE_TABS: { page: PageName; label: string; icon: string }[] = [
  { page: 'dashboard', label: 'Dashboard', icon: '📊' },
  { page: 'works', label: 'งานทั้งหมด', icon: '📋' },
  { page: 'subjects', label: 'วิชาเรียน', icon: '📚' },
]
