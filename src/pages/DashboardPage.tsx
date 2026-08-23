import { DashboardHero } from '../components/dashboard/DashboardHero'
import { DeadlineTimeline } from '../components/dashboard/DeadlineTimeline'
import { WorkStatusDonut, WorkStatusLegend } from '../components/dashboard/WorkStatusDonut'
import { LoadingSkeleton } from '../components/common/LoadingSkeleton'
import { useMediaQuery, DESKTOP_MEDIA_QUERY } from '../hooks/useMediaQuery'
import type { TodolistData } from '../hooks/useTodolistData'
import type { AcademicTerm, AppUser } from '../types/todolist'

interface DashboardPageProps {
  data: TodolistData
  term: AcademicTerm
  user: AppUser
  isLoading: boolean
  onOpenWork: (workId: string) => void
  onStartNextWork: () => void
  onGoToAllWorks: () => void
  onAddWork: () => void
}

export function DashboardPage({
  data,
  term,
  user,
  isLoading,
  onOpenWork,
  onStartNextWork,
  onGoToAllWorks,
  onAddWork,
}: DashboardPageProps) {
  const isDesktop = useMediaQuery(DESKTOP_MEDIA_QUERY)
  const remainingCount = data.statusSummary.total - data.statusSummary.completed

  return (
    <>
      <DashboardHero
        nextDueWork={data.nextDueWork}
        subject={data.nextDueWork ? data.subjectsById.get(data.nextDueWork.subjectId) : undefined}
        remainingCount={remainingCount}
        overdueCount={data.overdueCount}
        term={term}
        user={user}
        onStartWorking={onStartNextWork}
        onOpenWorkDetail={() => data.nextDueWork && onOpenWork(data.nextDueWork.id)}
      />

      {isLoading ? (
        <LoadingSkeleton variant="dashboard" />
      ) : (
        <main className="flex flex-col gap-3.5 px-[18px] py-4 lg:grid lg:grid-cols-[1fr_320px] lg:items-start lg:gap-5 lg:px-8 lg:py-6">
          {/* มือถือเอาสรุปสถานะขึ้นก่อน เพราะอ่านจบในหน้าจอเดียว */}
          <section
            aria-labelledby="status-summary-heading"
            className="order-first rounded-[20px] border border-ink/10 bg-white p-4 lg:order-none lg:col-start-2 lg:rounded-[22px] lg:p-5 lg:text-center"
          >
            <h2 id="status-summary-heading" className="mb-3.5 hidden text-[14.5px] font-bold lg:block">
              สถานะรวม
            </h2>
            <div className="flex items-center gap-3.5 lg:flex-col lg:gap-4">
              <WorkStatusDonut
                summary={data.statusSummary}
                size={isDesktop ? 176 : 112}
                strokeWidth={isDesktop ? 28 : 30}
              />
              <WorkStatusLegend summary={data.statusSummary} />
            </div>
          </section>

          <div className="lg:col-start-1 lg:row-start-1">
            <DeadlineTimeline
              works={data.upcomingWorks}
              subjectsById={data.subjectsById}
              onSelectWork={onOpenWork}
              onSeeAll={onGoToAllWorks}
              onAddWork={onAddWork}
            />
          </div>
        </main>
      )}
    </>
  )
}
