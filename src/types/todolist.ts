/** โดเมนของ Todolist — โครงสร้างนี้ตั้งใจให้ตรงกับข้อมูลจริงในอนาคต */

export type WorkStatus = 'notStarted' | 'inProgress' | 'completed'

/** คำนวณจากสถานะ + วันที่เหลือถึงกำหนดส่ง ไม่ได้ให้ผู้ใช้เลือกเอง — ดู computeWorkPriority */
export type WorkPriority = 'urgent' | 'high' | 'medium' | 'low'

export type WorkType = 'assignment' | 'exam' | 'presentation' | 'project' | 'other'

export interface Subject {
  id: string
  name: string
  /** อีโมจิหน้าการ์ดวิชา ผู้ใช้กรอกเองตอนเพิ่มวิชา */
  emoji: string
  academicYear: number
  semester: number
}

export interface Work {
  id: string
  title: string
  subjectId: string
  type: WorkType
  status: WorkStatus
  /** ISO date (YYYY-MM-DD) */
  dueDate: string
  note: string
  /** ISO datetime */
  createdAt: string
  ownerEmail: string
}

export interface AppUser {
  id: string
  email: string
  displayName: string
  isAdmin: boolean
  /** ISO date */
  signedUpAt: string
  /** ISO date */
  lastSignInAt: string
}

export interface AcademicTerm {
  academicYear: number
  semester: number
}

/** ข้อมูลที่ฟอร์ม "เพิ่มงานใหม่" ส่งกลับมา */
export interface NewWorkDraft {
  title: string
  subjectId: string
  type: WorkType | ''
  dueDate: string
  note: string
}

/** ข้อมูลที่ฟอร์ม "เพิ่มวิชาใหม่" ส่งกลับมา */
export interface NewSubjectDraft {
  name: string
  emoji: string
  academicYear: number
  semester: number
}

export type ToastTone = 'success' | 'info' | 'neutral' | 'error' | 'progress'

export interface Toast {
  id: number
  tone: ToastTone
  title: string
  description?: string
  icon: string
  actionLabel?: string
  onAction?: () => void
}

export type PageName = 'dashboard' | 'works' | 'subjects'
