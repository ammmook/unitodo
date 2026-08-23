import { useState } from 'react'
import { LoadingSkeleton } from '../components/common/LoadingSkeleton'
import { AdminUserList } from '../components/subject/AdminUserList'
import { SubjectCard } from '../components/subject/SubjectCard'
import type { TodolistData } from '../hooks/useTodolistData'
import type { AcademicTerm, AppUser } from '../types/todolist'

type SubjectsTab = 'mySubjects' | 'adminUsers'

interface SubjectsPageProps {
  data: TodolistData
  term: AcademicTerm
  currentUser: AppUser
  allUsers: AppUser[]
  isLoading: boolean
  onAddSubject: () => void
  onAddWorkForSubject: (subjectId: string) => void
  onOpenSubjectWorks: (subjectId: string) => void
}

export function SubjectsPage({
  data,
  term,
  currentUser,
  allUsers,
  isLoading,
  onAddSubject,
  onAddWorkForSubject,
  onOpenSubjectWorks,
}: SubjectsPageProps) {
  const [activeTab, setActiveTab] = useState<SubjectsTab>('mySubjects')
  const showAdminTab = currentUser.isAdmin

  return (
    <main className="flex flex-col gap-3.5 px-[18px] py-4 lg:gap-4.5 lg:px-8 lg:py-6.5">
      {/* มือถือ: แท็บตกลงมาเต็มแถวใต้หัวข้อ · desktop: อยู่ข้างปุ่ม Add Subject */}
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-3.5">
        <div className="mr-auto">
          <h1 className="text-[21px] font-extrabold -tracking-[0.4px] lg:text-2xl lg:-tracking-[0.5px]">
            วิชาเรียน
          </h1>
          <p className="mt-1 text-xs text-ink/75 lg:text-[13px]">
            {data.subjects.length} วิชา · เทอม {term.semester} / {term.academicYear}
          </p>
        </div>

        {showAdminTab && (
          <div
            role="tablist"
            aria-label="สลับหน้า"
            className="order-last flex basis-full gap-1 rounded-[13px] bg-sand p-1 lg:order-none lg:basis-auto"
          >
            <SubjectsTabButton
              shortLabel="วิชาของฉัน"
              label="วิชาของฉัน"
              isSelected={activeTab === 'mySubjects'}
              onSelect={() => setActiveTab('mySubjects')}
            />
            <SubjectsTabButton
              shortLabel="Admin"
              label="Admin · Users"
              isSelected={activeTab === 'adminUsers'}
              onSelect={() => setActiveTab('adminUsers')}
            />
          </div>
        )}

        <button
          type="button"
          onClick={onAddSubject}
          className="min-h-11 rounded-[13px] bg-ink px-3.5 text-[12.5px] font-bold whitespace-nowrap text-white transition-[transform,box-shadow] lg:rounded-[14px] lg:px-4 lg:text-[13px] lg:shadow-[0_5px_0_var(--color-highlight-shadow)] lg:active:translate-y-[3px] lg:active:shadow-[0_2px_0_var(--color-highlight-shadow)]"
        >
          + Add Subject
        </button>
      </header>

      {isLoading ? (
        <LoadingSkeleton variant="grid" />
      ) : activeTab === 'mySubjects' ? (
        <ul className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3.5">
          {data.subjectProgressList.map((progress) => (
            <li key={progress.subject.id}>
              <SubjectCard
                progress={progress}
                onAddFirstWork={onAddWorkForSubject}
                onOpenSubjectWorks={onOpenSubjectWorks}
              />
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={onAddSubject}
              className="h-full min-h-[120px] w-full rounded-[18px] border-2 border-dashed border-ink/20 text-[12.5px] font-bold text-ink/75 transition-colors hover:border-ink/40 hover:bg-sand lg:min-h-[150px] lg:rounded-[22px] lg:text-[13px]"
            >
              + เพิ่มวิชาใหม่
            </button>
          </li>
        </ul>
      ) : (
        <AdminUserList users={allUsers} />
      )}
    </main>
  )
}

function SubjectsTabButton({
  shortLabel,
  label,
  isSelected,
  onSelect,
}: {
  shortLabel: string
  label: string
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isSelected}
      onClick={onSelect}
      className={`min-h-10 flex-1 rounded-[10px] px-3.5 text-[12.5px] whitespace-nowrap lg:flex-none ${
        isSelected ? 'bg-white font-bold text-ink' : 'font-semibold text-ink/75'
      }`}
    >
      <span className="lg:hidden">{shortLabel}</span>
      <span className="hidden lg:inline">{label}</span>
    </button>
  )
}
