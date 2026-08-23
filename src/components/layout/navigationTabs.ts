import type { PageName } from '../../types/todolist'
import dashboardIcon from '../../assets/icon-nav/icon-dashboard.png'
import allWorksIcon from '../../assets/icon-nav/icon-allworks.png'
import subjectsIcon from '../../assets/icon-nav/icon-subjects.png'

export interface PageTab {
  page: PageName
  /** ข้อความใต้ไอคอนบน tab bar และบนปุ่ม nav ของ desktop */
  label: string
  /** คำอธิบายหน้าจอ ใช้เป็น title/aria ให้รู้ว่าแท็บนี้พาไปไหน */
  description: string
  iconSrc: string
}

/** เมนูหลัก ใช้ร่วมกันทั้ง AppHeader (desktop) และ MobileTabBar */
export const PAGE_TABS: PageTab[] = [
  {
    page: 'dashboard',
    label: 'Dashboard',
    description: 'ภาพรวมงานที่ใกล้ถึงกำหนดและสถานะรวม',
    iconSrc: dashboardIcon,
  },
  {
    page: 'works',
    label: 'งานทั้งหมด',
    description: 'ค้นหา กรอง และจัดการงานทุกชิ้น',
    iconSrc: allWorksIcon,
  },
  {
    page: 'subjects',
    label: 'วิชาเรียน',
    description: 'วิชาทั้งหมดในเทอมนี้และความคืบหน้า',
    iconSrc: subjectsIcon,
  },
]
