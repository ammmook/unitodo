import type { AcademicTerm } from '../types/todolist'

/**
 * ปีการศึกษา/เทอม — คำนวณจากวันที่จริง ไม่ต้องมาแก้โค้ดทุกปี
 * เทอม 1 มิ.ย.–ต.ค. · เทอม 2 พ.ย.–มี.ค. · เทอม 3 (ภาคฤดูร้อน) เม.ย.–พ.ค.
 */
function currentTerm(): AcademicTerm {
  const now = new Date()
  const month = now.getMonth() + 1
  const buddhistYear = now.getFullYear() + 543

  if (month >= 6 && month <= 10) return { academicYear: buddhistYear, semester: 1 }
  if (month >= 11) return { academicYear: buddhistYear, semester: 2 }
  // ม.ค.–มี.ค. ยังเป็นเทอม 2 ของปีการศึกษาที่แล้ว
  if (month <= 3) return { academicYear: buddhistYear - 1, semester: 2 }
  return { academicYear: buddhistYear - 1, semester: 3 }
}

export const CURRENT_TERM: AcademicTerm = currentTerm()

/** ตัวเลือกในดรอปดาวน์ — ย้อนหลังได้ 1 ปี ล่วงหน้าได้ 1 ปี */
export const ACADEMIC_YEAR_OPTIONS = [
  CURRENT_TERM.academicYear - 1,
  CURRENT_TERM.academicYear,
  CURRENT_TERM.academicYear + 1,
]

export const SEMESTER_OPTIONS = [1, 2, 3]
