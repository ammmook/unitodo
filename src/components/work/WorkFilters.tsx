import type { Subject, WorkStatus, WorkType } from '../../types/todolist'
import {
  WORK_STATUS_ORDER,
  WORK_STATUS_STYLE,
  WORK_TYPE_ORDER,
  WORK_TYPE_STYLE,
} from '../../utils/workFormatting'
import type { WorkStatusSummary } from '../../hooks/useTodolistData'

export type StatusFilter = WorkStatus | 'all'

interface WorkSearchBarProps {
  searchText: string
  onSearchTextChange: (value: string) => void
  subjects: Subject[]
  selectedSubjectId: string | 'all'
  onSelectedSubjectChange: (value: string | 'all') => void
  selectedType: WorkType | 'all'
  onSelectedTypeChange: (value: WorkType | 'all') => void
}

const SELECT_SHELL =
  'flex h-11.5 items-center gap-1.5 rounded-[14px] border border-ink/12 bg-white px-3 text-[12.5px] font-semibold text-ink/75'
const BARE_SELECT = 'min-w-0 border-0 bg-transparent text-[12.5px] font-semibold text-ink outline-none'

export function WorkSearchBar({
  searchText,
  onSearchTextChange,
  subjects,
  selectedSubjectId,
  onSelectedSubjectChange,
  selectedType,
  onSelectedTypeChange,
}: WorkSearchBarProps) {
  return (
    <search className="flex flex-wrap items-center gap-2.5">
      <label className="flex h-11.5 min-w-[220px] flex-1 items-center gap-2.5 rounded-[14px] border border-ink/12 bg-white px-3.5">
        <span aria-hidden="true" className="text-sm opacity-60">
          🔍
        </span>
        <input
          type="search"
          value={searchText}
          onChange={(event) => onSearchTextChange(event.target.value)}
          placeholder="ค้นหางาน หรือวิชา…"
          aria-label="ค้นหางาน"
          className="min-w-0 flex-1 border-0 bg-transparent text-[13.5px] font-medium text-ink outline-none"
        />
      </label>

      <label className={`${SELECT_SHELL} hidden lg:flex`}>
        วิชา
        <select
          value={selectedSubjectId}
          onChange={(event) => onSelectedSubjectChange(event.target.value)}
          className={BARE_SELECT}
        >
          <option value="all">ทั้งหมด</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
      </label>

      <label className={`${SELECT_SHELL} hidden lg:flex`}>
        ประเภท
        <select
          value={selectedType}
          onChange={(event) => onSelectedTypeChange(event.target.value as WorkType | 'all')}
          className={BARE_SELECT}
        >
          <option value="all">ทั้งหมด</option>
          {WORK_TYPE_ORDER.map((type) => (
            <option key={type} value={type}>
              {WORK_TYPE_STYLE[type].label}
            </option>
          ))}
        </select>
      </label>
    </search>
  )
}

interface WorkStatusTabsProps {
  selectedStatus: StatusFilter
  onSelectStatus: (status: StatusFilter) => void
  summary: WorkStatusSummary
}

/** แถบกรองตามสถานะ — บนมือถือเลื่อนแนวนอนได้ */
export function WorkStatusTabs({ selectedStatus, onSelectStatus, summary }: WorkStatusTabsProps) {
  const tabs: { value: StatusFilter; shortLabel: string; label: string; count: number }[] = [
    { value: 'all', shortLabel: 'ทั้งหมด', label: 'ทั้งหมด', count: summary.total },
    ...WORK_STATUS_ORDER.map((status) => ({
      value: status as StatusFilter,
      shortLabel: `${WORK_STATUS_STYLE[status].icon} ${WORK_STATUS_STYLE[status].shortLabel}`,
      label: `${WORK_STATUS_STYLE[status].icon} ${WORK_STATUS_STYLE[status].label}`,
      count: summary[status],
    })),
  ]

  return (
    <div
      role="tablist"
      aria-label="กรองตามสถานะ"
      className="-mx-[18px] flex gap-2 overflow-x-auto px-[18px] pb-0.5 lg:mx-0 lg:flex-wrap lg:px-0"
    >
      {tabs.map((tab) => {
        const isSelected = tab.value === selectedStatus
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onSelectStatus(tab.value)}
            className={`min-h-9.5 shrink-0 rounded-full px-3.5 text-xs font-bold whitespace-nowrap transition-colors lg:min-h-10 lg:px-4 lg:text-[12.5px] ${
              isSelected
                ? 'bg-ink text-white'
                : 'border border-ink/15 bg-white text-ink hover:bg-highlight-soft'
            }`}
          >
            <span className="lg:hidden">{tab.shortLabel}</span>
            <span className="hidden lg:inline">{tab.label}</span> · {tab.count}
          </button>
        )
      })}
    </div>
  )
}
