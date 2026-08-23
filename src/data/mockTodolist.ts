import type { AcademicTerm, AppUser, Subject, Work } from '../types/todolist'
import { toLocalIsoDate } from '../utils/workFormatting'

/**
 * Mock data ทั้งหมดอยู่ในไฟล์นี้ไฟล์เดียว
 * เปลี่ยนไปต่อ backend จริงภายหลังได้โดยไม่ต้องแตะ UI
 */

const SIGNED_IN_EMAIL = 'narudonponsueb1234@gmail.com'

/** สร้างวันที่แบบ ISO โดยนับจากวันนี้ เพื่อให้ "อีก n วัน" ใน mockup ยังสมจริงเสมอ */
function isoDateFromToday(dayOffset: number): string {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + dayOffset)
  return toLocalIsoDate(date)
}

function isoDateTimeFromToday(dayOffset: number, hour: number, minute: number): string {
  const date = new Date()
  date.setHours(hour, minute, 0, 0)
  date.setDate(date.getDate() + dayOffset)
  return date.toISOString()
}

export const CURRENT_TERM: AcademicTerm = { academicYear: 2569, semester: 1 }

/** ตัวเลือกในดรอปดาวน์ปีการศึกษา / เทอม */
export const ACADEMIC_YEAR_OPTIONS = [2568, 2569, 2570]
export const SEMESTER_OPTIONS = [1, 2, 3]

export const SIGNED_IN_USER: AppUser = {
  id: 'user-narudon',
  email: SIGNED_IN_EMAIL,
  displayName: 'Narudon',
  isAdmin: true,
  signedUpAt: '2026-04-01',
  lastSignInAt: isoDateFromToday(0),
}

export const MOCK_SUBJECTS: Subject[] = [
  { id: 'subject-cactus', name: 'Cactus', emoji: '🌵', academicYear: 2569, semester: 1 },
  { id: 'subject-testing', name: 'Testing 1', emoji: '🧪', academicYear: 2569, semester: 1 },
  { id: 'subject-web', name: 'Web', emoji: '🌐', academicYear: 2569, semester: 1 },
  { id: 'subject-startup', name: 'StartUp', emoji: '🚀', academicYear: 2569, semester: 1 },
  { id: 'subject-java', name: 'Java', emoji: '☕', academicYear: 2569, semester: 1 },
  { id: 'subject-english', name: 'English', emoji: '🅰️', academicYear: 2569, semester: 1 },
  { id: 'subject-golang', name: 'Golang', emoji: '🐹', academicYear: 2569, semester: 1 },
]

export const MOCK_WORKS: Work[] = [
  {
    id: 'work-java-report',
    title: 'รายงานสรุปบท OOP',
    subjectId: 'subject-java',
    type: 'homework',
    status: 'notStarted',
    priority: 'high',
    dueDate: isoDateFromToday(-12),
    note: '',
    createdAt: isoDateTimeFromToday(-25, 9, 20),
    ownerEmail: SIGNED_IN_EMAIL,
  },
  {
    id: 'work-cactus-lab1',
    title: 'Lab 1',
    subjectId: 'subject-cactus',
    type: 'homework',
    status: 'inProgress',
    priority: 'high',
    dueDate: isoDateFromToday(3),
    note: 'draw cactus and write detail of cactus',
    createdAt: isoDateTimeFromToday(-4, 11, 45),
    ownerEmail: SIGNED_IN_EMAIL,
  },
  {
    id: 'work-testing-lab2',
    title: 'Lab2',
    subjectId: 'subject-testing',
    type: 'exam',
    status: 'notStarted',
    priority: 'high',
    dueDate: isoDateFromToday(7),
    note: 'ทบทวน test case ทั้ง 3 แบบก่อนสอบ',
    createdAt: isoDateTimeFromToday(-3, 15, 10),
    ownerEmail: SIGNED_IN_EMAIL,
  },
  {
    id: 'work-startup-posttest',
    title: 'Post test 1',
    subjectId: 'subject-startup',
    type: 'assignment',
    status: 'inProgress',
    priority: 'medium',
    dueDate: isoDateFromToday(14),
    note: '',
    createdAt: isoDateTimeFromToday(-6, 10, 5),
    ownerEmail: SIGNED_IN_EMAIL,
  },
  {
    id: 'work-cactus-classify',
    title: 'แยกประเภทกระบองเพชร',
    subjectId: 'subject-cactus',
    type: 'assignment',
    status: 'notStarted',
    priority: 'medium',
    dueDate: isoDateFromToday(17),
    note: '',
    createdAt: isoDateTimeFromToday(-2, 20, 30),
    ownerEmail: SIGNED_IN_EMAIL,
  },
  {
    id: 'work-startup-pitch',
    title: 'Pitch deck ทีม 4',
    subjectId: 'subject-startup',
    type: 'presentation',
    status: 'notStarted',
    priority: 'low',
    dueDate: isoDateFromToday(21),
    note: '',
    createdAt: isoDateTimeFromToday(-1, 8, 0),
    ownerEmail: SIGNED_IN_EMAIL,
  },
  {
    id: 'work-web-reuse',
    title: 'Lab Reuse Components',
    subjectId: 'subject-web',
    type: 'assignment',
    status: 'completed',
    priority: 'medium',
    dueDate: isoDateFromToday(-8),
    note: '',
    createdAt: isoDateTimeFromToday(-20, 13, 15),
    ownerEmail: SIGNED_IN_EMAIL,
  },
  {
    id: 'work-web-startup-study',
    title: 'Study Start-Up',
    subjectId: 'subject-web',
    type: 'homework',
    status: 'completed',
    priority: 'low',
    dueDate: isoDateFromToday(-5),
    note: '',
    createdAt: isoDateTimeFromToday(-18, 17, 40),
    ownerEmail: SIGNED_IN_EMAIL,
  },
  {
    id: 'work-testing-quiz',
    title: 'Quiz หน่วยที่ 2',
    subjectId: 'subject-testing',
    type: 'exam',
    status: 'completed',
    priority: 'medium',
    dueDate: isoDateFromToday(-2),
    note: '',
    createdAt: isoDateTimeFromToday(-14, 9, 0),
    ownerEmail: SIGNED_IN_EMAIL,
  },
]

/** เห็นเฉพาะผู้ใช้ที่ isAdmin */
export const MOCK_USERS: AppUser[] = [
  {
    id: 'user-ruthaichanok',
    email: 'ruthaichanok.37355@gmail.com',
    displayName: 'Ruthaichanok',
    isAdmin: true,
    signedUpAt: '2026-04-01',
    lastSignInAt: isoDateFromToday(-19),
  },
  SIGNED_IN_USER,
  {
    id: 'user-pimchanok',
    email: 'pimchanok@school.ac.th',
    displayName: 'Pimchanok',
    isAdmin: false,
    signedUpAt: '2026-07-03',
    lastSignInAt: isoDateFromToday(-51),
  },
  {
    id: 'user-ammmook',
    email: 'ammmook04@gmail.com',
    displayName: 'Ammmook',
    isAdmin: false,
    signedUpAt: '2026-07-03',
    lastSignInAt: isoDateFromToday(-51),
  },
]

/** อีโมจิที่จะหยิบมาใช้เวลาเพิ่มวิชาใหม่ */
export const SUBJECT_EMOJI_POOL = ['📘', '🎨', '🧮', '🎧', '🔬', '🗺️', '🏀', '🎼']
