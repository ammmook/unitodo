import { useMemo, useState } from 'react'
import { LoadingSkeleton } from '../components/common/LoadingSkeleton'
import { EmptyState } from '../components/common/EmptyState'
import { TermSelector } from '../components/layout/AppIdentity'
import { WorkCard } from '../components/work/WorkCard'
import { WorkDetailPanel } from '../components/work/WorkDetailPanel'
import { WorkSearchBar, WorkStatusTabs, type StatusFilter } from '../components/work/WorkFilters'
import { DESKTOP_MEDIA_QUERY, useMediaQuery } from '../hooks/useMediaQuery'
import type { TodolistData } from '../hooks/useTodolistData'
import type { AcademicTerm, Work, WorkStatus, WorkType } from '../types/todolist'

interface AllWorksPageProps {
  data: TodolistData
  term: AcademicTerm
  onTermChange: (term: AcademicTerm) => void
  isLoading: boolean
  selectedWorkId: string | null
  onSelectWork: (workId: string | null) => void
  onToggleCompleted: (work: Work) => void
  onChangeStatus: (work: Work, status: WorkStatus) => void
  onSaveNote: (work: Work, note: string) => void
  onRequestDelete: (work: Work) => void
  onAddWork: () => void
  subjectFilterId: string | 'all'
  onSubjectFilterChange: (subjectId: string | 'all') => void
}

export function AllWorksPage({
  data,
  term,
  onTermChange,
  isLoading,
  selectedWorkId,
  onSelectWork,
  onToggleCompleted,
  onChangeStatus,
  onSaveNote,
  onRequestDelete,
  onAddWork,
  subjectFilterId,
  onSubjectFilterChange,
}: AllWorksPageProps) {
  const isDesktop = useMediaQuery(DESKTOP_MEDIA_QUERY)
  const [searchText, setSearchText] = useState('')
  const [typeFilter, setTypeFilter] = useState<WorkType | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const visibleWorks = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()
    return data.works.filter((work) => {
      if (statusFilter !== 'all' && work.status !== statusFilter) return false
      if (subjectFilterId !== 'all' && work.subjectId !== subjectFilterId) return false
      if (typeFilter !== 'all' && work.type !== typeFilter) return false
      if (keyword === '') return true

      const subjectName = data.subjectsById.get(work.subjectId)?.name ?? ''
      return (
        work.title.toLowerCase().includes(keyword) ||
        subjectName.toLowerCase().includes(keyword)
      )
    })
  }, [data.works, data.subjectsById, searchText, statusFilter, subjectFilterId, typeFilter])

  const selectedWork = selectedWorkId
    ? (data.works.find((work) => work.id === selectedWorkId) ?? null)
    : null

  const hasActiveFilters =
    searchText.trim() !== '' || statusFilter !== 'all' || subjectFilterId !== 'all' || typeFilter !== 'all'

  const clearFilters = () => {
    setSearchText('')
    setStatusFilter('all')
    setTypeFilter('all')
    onSubjectFilterChange('all')
  }

  return (
    <div className={selectedWork ? 'lg:grid lg:grid-cols-[1fr_380px] lg:items-start' : ''}>
      <main className="flex min-w-0 flex-col gap-3 lg:gap-4 lg:px-7 lg:py-6.5">
        <header className="sticky top-0 z-20 flex flex-col gap-3 bg-cream px-[18px] pt-4 pb-2 lg:static lg:gap-4 lg:px-0 lg:pt-0 lg:pb-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-[21px] font-extrabold -tracking-[0.4px] lg:text-2xl lg:-tracking-[0.5px]">
              งานทั้งหมด{' '}
              <span className="text-[12.5px] font-semibold text-ink/75 lg:text-sm">
                {data.statusSummary.total} งาน
              </span>
            </h1>
            <span className="lg:hidden">
              <TermSelector term={term} onTermChange={onTermChange} tone="onLight" />
            </span>
            <button
              type="button"
              onClick={onAddWork}
              className="hidden min-h-11 rounded-[14px] bg-ink px-4.5 text-[13.5px] font-bold text-white shadow-[0_5px_0_var(--color-highlight-shadow)] transition-[transform,box-shadow] active:translate-y-[3px] active:shadow-[0_2px_0_var(--color-highlight-shadow)] lg:block"
            >
              + Add Work
            </button>
          </div>

          <WorkSearchBar
            searchText={searchText}
            onSearchTextChange={setSearchText}
            subjects={data.subjects}
            selectedSubjectId={subjectFilterId}
            onSelectedSubjectChange={onSubjectFilterChange}
            selectedType={typeFilter}
            onSelectedTypeChange={setTypeFilter}
          />

          <WorkStatusTabs
            selectedStatus={statusFilter}
            onSelectStatus={setStatusFilter}
            summary={data.statusSummary}
          />
        </header>

        {isLoading ? (
          <LoadingSkeleton variant="list" />
        ) : visibleWorks.length === 0 ? (
          <div className="px-[18px] lg:px-0">
            {hasActiveFilters ? (
              <EmptyState
                icon="🔍"
                title="ไม่พบงานที่ค้นหา"
                description="ลองเปลี่ยนคำค้น หรือล้างตัวกรองดู"
                actionLabel="ล้างตัวกรอง"
                actionTone="quiet"
                onAction={clearFilters}
              />
            ) : (
              <EmptyState
                icon="✨"
                title="Nothing here yet!"
                description="ยังไม่มีงานในรายการนี้ ลองเพิ่มงานใหม่กันเลย"
                actionLabel="+ Add Work"
                onAction={onAddWork}
              />
            )}
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5 px-[18px] pb-4 lg:gap-3 lg:px-0 lg:pb-0">
            {visibleWorks.map((work) => (
              <li key={work.id}>
                <WorkCard
                  work={work}
                  subject={data.subjectsById.get(work.subjectId)}
                  isSelected={work.id === selectedWorkId}
                  onSelect={onSelectWork}
                  onToggleCompleted={onToggleCompleted}
                />
              </li>
            ))}
          </ul>
        )}
      </main>

      {/* ปุ่มเพิ่มงานลอยของมือถือ — ใช้ SVG เพื่อให้เครื่องหมาย + อยู่กึ่งกลางวงกลมพอดีทุกขนาดจอ */}
      <button
        type="button"
        aria-label="เพิ่มงานใหม่"
        onClick={onAddWork}
        className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+96px)] z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-ink text-highlight shadow-[0_12px_24px_-12px_rgba(42,38,34,.85)] transition-transform active:scale-95 sm:h-15 sm:w-15 lg:hidden"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="h-6 w-6 sm:h-7 sm:w-7"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      {selectedWork &&
        (isDesktop ? (
          <aside
            aria-label="รายละเอียดงาน"
            className="animate-rise sticky top-0 h-dvh border-l border-ink/10 bg-white"
          >
            <WorkDetailPanel
              key={selectedWork.id}
              work={selectedWork}
              subject={data.subjectsById.get(selectedWork.subjectId)}
              term={term}
              onClose={() => onSelectWork(null)}
              onChangeStatus={(status) => onChangeStatus(selectedWork, status)}
              onSaveNote={(note) => onSaveNote(selectedWork, note)}
              onRequestDelete={() => onRequestDelete(selectedWork)}
            />
          </aside>
        ) : (
          <div
            className="animate-scrim-in fixed inset-0 z-40 flex flex-col justify-end bg-ink/45"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) onSelectWork(null)
            }}
          >
            <section
              aria-label="รายละเอียดงาน"
              className="animate-sheet-up max-h-[88dvh] overflow-hidden rounded-t-[26px] bg-cream"
            >
              <span
                aria-hidden="true"
                className="mx-auto mt-3 block h-[5px] w-11 rounded-full bg-ink/20"
              />
              <WorkDetailPanel
                key={selectedWork.id}
                work={selectedWork}
                subject={data.subjectsById.get(selectedWork.subjectId)}
                term={term}
                onClose={() => onSelectWork(null)}
                onChangeStatus={(status) => onChangeStatus(selectedWork, status)}
                onSaveNote={(note) => onSaveNote(selectedWork, note)}
                onRequestDelete={() => onRequestDelete(selectedWork)}
              />
            </section>
          </div>
        ))}
    </div>
  )
}
