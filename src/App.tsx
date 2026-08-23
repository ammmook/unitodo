import { useCallback, useEffect, useState } from 'react'
import { ConfirmDialog } from './components/common/ConfirmDialog'
import { ToastStack } from './components/common/ToastStack'
import { AppHeader } from './components/layout/AppHeader'
import { MobileTabBar } from './components/layout/MobileTabBar'
import { AddSubjectModal } from './components/subject/AddSubjectModal'
import { AddWorkModal } from './components/work/AddWorkModal'
import { CURRENT_TERM, MOCK_USERS, SIGNED_IN_USER } from './data/mockTodolist'
import { useToasts } from './hooks/useToasts'
import { useTodolistData } from './hooks/useTodolistData'
import { AllWorksPage } from './pages/AllWorksPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { SubjectsPage } from './pages/SubjectsPage'
import type {
  NewSubjectDraft,
  NewWorkDraft,
  PageName,
  Work,
  WorkStatus,
} from './types/todolist'
import { WORK_TYPE_STYLE, formatDueDate } from './utils/workFormatting'

/** เวลาที่จำลองการโหลดข้อมูลครั้งแรก ให้เห็น skeleton ตาม design */
const INITIAL_LOAD_MS = 700

type OpenModal =
  | { kind: 'none' }
  | { kind: 'addWork'; presetSubjectId?: string }
  | { kind: 'addSubject' }
  | { kind: 'confirmDeleteWork'; work: Work }

export default function App() {
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [currentPage, setCurrentPage] = useState<PageName>('dashboard')
  const [isLoading, setIsLoading] = useState(true)
  const [openModal, setOpenModal] = useState<OpenModal>({ kind: 'none' })
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null)
  const [subjectFilterId, setSubjectFilterId] = useState<string | 'all'>('all')

  const data = useTodolistData()
  const { toasts, showToast, dismissToast } = useToasts()

  useEffect(() => {
    if (!isSignedIn) return
    const timeoutId = setTimeout(() => setIsLoading(false), INITIAL_LOAD_MS)
    return () => clearTimeout(timeoutId)
  }, [isSignedIn])

  const closeModal = useCallback(() => setOpenModal({ kind: 'none' }), [])

  const openWorkDetail = useCallback((workId: string) => {
    setCurrentPage('works')
    setSelectedWorkId(workId)
  }, [])

  const handleCreateWork = (draft: NewWorkDraft) => {
    const created = data.addWork(draft)
    const subjectName = data.subjectsById.get(created.subjectId)?.name ?? ''
    showToast({
      tone: 'success',
      icon: '✓',
      title: 'เพิ่มงานแล้ว 🎉',
      description: `${created.title} · ${subjectName} · ${WORK_TYPE_STYLE[created.type].label} · ส่ง ${formatDueDate(created.dueDate, false)}`,
      actionLabel: 'ดูงาน',
      onAction: () => openWorkDetail(created.id),
    })
  }

  const handleCreateSubject = (draft: NewSubjectDraft) => {
    const created = data.addSubject(draft)
    showToast({
      tone: 'neutral',
      icon: '📚',
      title: 'เพิ่มวิชาแล้ว',
      description: `${created.name} · เทอม ${created.semester} / ${created.academicYear}`,
    })
  }

  const handleToggleCompleted = (work: Work) => {
    const nextStatus: WorkStatus = work.status === 'completed' ? 'notStarted' : 'completed'
    data.updateWork(work.id, { status: nextStatus })

    if (nextStatus === 'completed') {
      const remaining = data.statusSummary.total - data.statusSummary.completed - 1
      showToast({
        tone: 'success',
        icon: '✓',
        title: 'Done! เยี่ยมมาก 🎉',
        description: `${work.title} เสร็จแล้ว — เหลืออีก ${remaining} งาน`,
      })
    }
  }

  const handleChangeStatus = (work: Work, status: WorkStatus) => {
    if (work.status === status) return
    data.updateWork(work.id, { status })

    if (status === 'inProgress') {
      showToast({
        tone: 'info',
        icon: '⚡',
        title: 'เริ่มทำแล้ว',
        description: `${work.title} เปลี่ยนเป็น In Progress`,
      })
    } else if (status === 'completed') {
      showToast({
        tone: 'success',
        icon: '✓',
        title: 'Done! เยี่ยมมาก 🎉',
        description: `${work.title} เสร็จแล้ว`,
      })
    }
  }

  const handleSaveNote = (work: Work, note: string) => {
    data.updateWork(work.id, { note })
    showToast({
      tone: 'progress',
      icon: '💾',
      title: 'บันทึกแล้ว',
      description: work.title,
    })
  }

  const handleDeleteWork = (work: Work) => {
    data.deleteWork(work.id)
    setSelectedWorkId(null)
    closeModal()
    showToast({
      tone: 'neutral',
      icon: '🗑️',
      title: 'ลบงานแล้ว',
      description: `${work.title} · ${data.subjectsById.get(work.subjectId)?.name ?? ''}`,
      actionLabel: 'Undo',
      onAction: () => data.restoreWork(work),
    })
  }

  const handleStartNextWork = () => {
    if (!data.nextDueWork) return
    handleChangeStatus(data.nextDueWork, 'inProgress')
    openWorkDetail(data.nextDueWork.id)
  }

  const goToSubjectWorks = (subjectId: string) => {
    setSubjectFilterId(subjectId)
    setCurrentPage('works')
  }

  if (!isSignedIn) {
    return <LoginPage onSignIn={() => setIsSignedIn(true)} />
  }

  return (
    <div className="flex min-h-dvh flex-col bg-cream">
      <AppHeader
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        term={CURRENT_TERM}
        user={SIGNED_IN_USER}
      />

      <div className="flex-1">
        {currentPage === 'dashboard' && (
          <DashboardPage
            data={data}
            term={CURRENT_TERM}
            user={SIGNED_IN_USER}
            isLoading={isLoading}
            onOpenWork={openWorkDetail}
            onStartNextWork={handleStartNextWork}
            onGoToAllWorks={() => setCurrentPage('works')}
            onAddWork={() => setOpenModal({ kind: 'addWork' })}
          />
        )}

        {currentPage === 'works' && (
          <AllWorksPage
            data={data}
            term={CURRENT_TERM}
            isLoading={isLoading}
            selectedWorkId={selectedWorkId}
            onSelectWork={setSelectedWorkId}
            onToggleCompleted={handleToggleCompleted}
            onChangeStatus={handleChangeStatus}
            onSaveNote={handleSaveNote}
            onRequestDelete={(work) => setOpenModal({ kind: 'confirmDeleteWork', work })}
            onAddWork={() => setOpenModal({ kind: 'addWork' })}
            subjectFilterId={subjectFilterId}
            onSubjectFilterChange={setSubjectFilterId}
          />
        )}

        {currentPage === 'subjects' && (
          <SubjectsPage
            data={data}
            term={CURRENT_TERM}
            currentUser={SIGNED_IN_USER}
            allUsers={MOCK_USERS}
            isLoading={isLoading}
            onAddSubject={() => setOpenModal({ kind: 'addSubject' })}
            onAddWorkForSubject={(subjectId) => setOpenModal({ kind: 'addWork', presetSubjectId: subjectId })}
            onOpenSubjectWorks={goToSubjectWorks}
          />
        )}
      </div>

      <MobileTabBar currentPage={currentPage} onNavigate={setCurrentPage} />

      {openModal.kind === 'addWork' && (
        <AddWorkModal
          subjects={data.subjects}
          term={CURRENT_TERM}
          presetSubjectId={openModal.presetSubjectId}
          onClose={closeModal}
          onCreated={handleCreateWork}
        />
      )}

      {openModal.kind === 'addSubject' && (
        <AddSubjectModal
          term={CURRENT_TERM}
          ownerEmail={SIGNED_IN_USER.email}
          isNameTaken={data.hasSubjectName}
          onClose={closeModal}
          onCreated={handleCreateSubject}
        />
      )}

      {openModal.kind === 'confirmDeleteWork' && (
        <ConfirmDialog
          icon="🗑️"
          title={`ลบงาน “${openModal.work.title}”?`}
          description="งานนี้จะหายไปจากรายการ กด Undo ในแจ้งเตือนเพื่อเอากลับมาได้"
          confirmLabel="ลบเลย"
          onConfirm={() => handleDeleteWork(openModal.work)}
          onCancel={closeModal}
        />
      )}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
