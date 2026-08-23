import { ACADEMIC_YEAR_OPTIONS, SEMESTER_OPTIONS } from '../../data/mockTodolist'
import type { AcademicTerm } from '../../types/todolist'

/** โลโก้ + ชื่อแอป */
export function BrandMark({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const badgeSize = size === 'sm' ? 'h-[30px] w-[30px] text-[13px]' : 'h-8 w-8 text-sm'
  return (
    <span className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className={`grid ${badgeSize} place-items-center rounded-xl bg-highlight font-extrabold text-ink`}
      >
        T
      </span>
      <strong className="text-[15px] -tracking-[0.2px]">Todolist</strong>
    </span>
  )
}

interface TermSelectorProps {
  term: AcademicTerm
  onTermChange: (term: AcademicTerm) => void
  tone: 'onDark' | 'onLight'
}

/** เลือกปีการศึกษาและเทอมแยกกัน 2 dropdown — งานและวิชาจะถูกกรองตามที่เลือก */
export function TermSelector({ term, onTermChange, tone }: TermSelectorProps) {
  const toneClass =
    tone === 'onDark'
      ? 'border-cream/30 bg-transparent text-cream hover:bg-cream/15 [&>option]:bg-ink [&>option]:text-cream'
      : 'border-ink/15 bg-white text-ink hover:bg-sand'

  const selectClass = `min-h-10 min-w-0 shrink rounded-xl border px-2.5 text-[12.5px] font-semibold whitespace-nowrap transition-colors ${toneClass}`

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <select
        aria-label="ปีการศึกษา"
        value={term.academicYear}
        onChange={(event) =>
          onTermChange({ ...term, academicYear: Number(event.target.value) })
        }
        className={selectClass}
      >
        {ACADEMIC_YEAR_OPTIONS.map((year) => (
          <option key={year} value={year}>
            ปี {year}
          </option>
        ))}
      </select>

      <select
        aria-label="เทอม"
        value={term.semester}
        onChange={(event) => onTermChange({ ...term, semester: Number(event.target.value) })}
        className={selectClass}
      >
        {SEMESTER_OPTIONS.map((semester) => (
          <option key={semester} value={semester}>
            เทอม {semester}
          </option>
        ))}
      </select>
    </div>
  )
}
